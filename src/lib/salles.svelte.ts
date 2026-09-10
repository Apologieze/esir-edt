import { universities, sallesEvents, type Event } from "@cours-esir/salles_module"
import { convertIcsCalendar } from "ts-ics"
import { PromisePool } from '@supercharge/promise-pool'
import { SHU_FEEDS } from "./shu_feeds"

function getMonday(d: Date) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// planning.univ-rennes1.fr ne répond plus que par une 301 vers planning.univ-rennes.fr
// (migration Université de Rennes). On attaque le nouveau domaine directement
// pour économiser un aller-retour par salle.
function normalizeRootUrl(rootUrl: string): string {
    return rootUrl.replace("planning.univ-rennes1.fr", "planning.univ-rennes.fr")
}

type dataType = { [university: string]: { [building: string]: { [room: string]: { events: Event[], id: string } } } }

export type SyncStats = { total: number, loaded: number, failed: number, at: Date }

export class Salles {

    static update = new Date(0)

    static dataEvents: dataType = {}

    static lastSync: SyncStats = { total: 0, loaded: 0, failed: 0, at: new Date(0) }

    static setDataFromPath(p1: string, p2: string, p3: string, n: { events: Event[], id: string }) {
        if (Salles.dataEvents[p1] === undefined) { Salles.dataEvents[p1] = {} }
        if (Salles.dataEvents[p1][p2] === undefined) { Salles.dataEvents[p1][p2] = {} }
        Salles.dataEvents[p1][p2][p3] = n
    }

    static roomId(university: string, building: string, room: string): string {
        return btoa(JSON.stringify([university, building, room]))
    }

    // Stocke les événements d'une publication .shu (UNE SEULE salle : par
    // construction ADE, tous les événements concernent cette salle). Filtre
    // sur la fenêtre [dateS, dateE] pour garder le même volume de données que
    // l'ancien endpoint (payload SSR léger, même sémantique pour salleLibres).
    // Une publication qui répond = données de confiance : zéro événement sur
    // la fenêtre compte comme chargée.
    static storeFeedEvents(university: string, building: string, room: string, feedEvents: Event[], dateS: Date, dateE: Date) {
        const evs = feedEvents
            .filter(ev => {
                const start = ev.start.date.getTime()
                const end = (ev.end?.date ?? ev.start.date).getTime()
                return start <= dateE.getTime() && end >= dateS.getTime()
            })
            .sort((a, b) => a.start.date.getTime() - b.start.date.getTime())
        Salles.setDataFromPath(university, building, room, { events: evs, id: Salles.roomId(university, building, room) })
        Salles.lastSync.loaded++

        // Garde-fou : si aucun événement ne mentionne la salle dans LOCATION,
        // le lien collé n'est probablement pas celui de cette salle.
        const mentions = evs.filter(ev =>
            (ev.location ?? "").split(",").map(s => s.trim()).some(entry => {
                const suffix = (entry.match(/-\s*(.+)$/)?.[1] ?? entry).trim()
                return suffix === room || (suffix.startsWith(room) && /^[\s(]/.test(suffix.slice(room.length)))
            })
        ).length
        if (evs.length > 0 && mentions === 0) {
            console.warn(`SHU feed ${building} / ${room}: aucun événement ne mentionne cette salle (mauvais lien ?)`)
        }
        console.info(`SHU feed ${building} / ${room}: ${feedEvents.length} events reçus, ${evs.length} dans la fenêtre`)
    }

    static async getCal() {
        let date = new Date()

        if (date.getTime() - Salles.update.getTime() > 1000 * 60 * 60 * 3) {
            Salles.update = date
            Salles.lastSync = { total: 0, loaded: 0, failed: 0, at: new Date() }
            let dateS = getMonday(new Date())
            let dateE = new Date()
            dateE.setDate(dateS.getDate() + 14)

            let promises: { id: string, rootUrl: string, resourceId: string, projectId: string }[] = []

            for (let university of universities) {
                for (let building of university.buildings) {
                    for (let room of building.rooms) {
                        let id = btoa(JSON.stringify([university.name, building.name, room.name]))
                        promises.push({ id, rootUrl: university.rootUrl, resourceId: room.resourceId, projectId: room.projectId })
                    }
                }
            }
            Salles.lastSync.total = promises.length

            const feedByRoom = new Map(SHU_FEEDS.map(f => [f.university + "\0" + f.building + "\0" + f.room, f.url]))
            const feedKeys = new Set(feedByRoom.keys())
            const legacyPromises = promises.filter(el => {
                const path = JSON.parse(atob(el.id))
                return !feedKeys.has(path[0] + "\0" + path[1] + "\0" + path[2])
            })

            // 1) Salles prioritaires avec publication .shu : un fetch par salle.
            //    Remplace l'endpoint anonyme HS pour ces salles.
            await PromisePool.withConcurrency(5).for(SHU_FEEDS).process(async f => {
                const label = `${f.building} / ${f.room}`
                try {
                    const res = await fetch(f.url)
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const ics = await res.text()
                    if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("response is not an ICS calendar")
                    const feedEvents = convertIcsCalendar(undefined, ics).events || []
                    Salles.storeFeedEvents(f.university, f.building, f.room, feedEvents, dateS, dateE)
                } catch (e) {
                    Salles.setDataFromPath(f.university, f.building, f.room, {
                        events: [], id: Salles.roomId(f.university, f.building, f.room)
                    })
                    Salles.lastSync.failed++
                    console.error(`SHU feed failed for ${label} (${f.url}):`, e)
                }
            })

            // 2) Repli legacy (anonymous_cal.jsp) pour les salles sans publication.
            await PromisePool.withConcurrency(10).for(legacyPromises).process(async el => {
                const label = atob(el.id)
                for (let i = 0; i < 5; i++) {
                    try {
                        let events = await sallesEvents(normalizeRootUrl(el.rootUrl), [el.resourceId], el.projectId, dateS, dateE)
                        let path = JSON.parse(atob(el.id))
                        Salles.setDataFromPath(path[0], path[1], path[2], {
                            events, id: el.id
                        })
                        if (events.length === 0) {
                            // Pas d'exception mais aucune donnée : l'endpoint ADE anonyme
                            // (anonymous_cal.jsp) renvoie HTTP 200 avec un corps vide.
                            // C'est un état déterministe côté serveur (ex. consultation
                            // anonyme désactivée), inutile de réessayer : on log et on
                            // marque la salle en échec pour le bandeau d'alerte.
                            Salles.lastSync.failed++
                            console.warn(`Empty calendar for ${label}: ADE anonymous endpoint returned no events (anonymous access may be disabled server-side)`)
                        } else {
                            Salles.lastSync.loaded++
                        }
                        return
                    } catch (error) {
                        console.error("Could not load", label, "try", i, error)
                    }
                }
                Salles.lastSync.failed++
                console.error("Could not load", label, "after 5 tries")
            })
            Salles.lastSync.at = new Date()
            console.info(`ADE sync: ${Salles.lastSync.loaded}/${Salles.lastSync.total} rooms loaded, ${Salles.lastSync.failed} failed`)
        }
        return Salles.dataEvents
    }

    static async getByKey(key: string): Promise<{ events: Event[]; id: string; }> {
        let cal = await Salles.getCal()
        let path: string[]
        try {
            path = JSON.parse(atob(key))
        } catch {
            throw new Error(`Invalid room key: ${key}`)
        }
        const room = cal?.[path[0]]?.[path[1]]?.[path[2]]
        if (!room) {
            throw new Error(`Room not found for key: ${key}`)
        }
        return room
    }
}