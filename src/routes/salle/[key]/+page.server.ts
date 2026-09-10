export const prerender = false
export const ssr = true

import { Salles } from "$lib/salles.svelte";
import { error } from "@sveltejs/kit";

export const load = async ({ params }) => {
    try {
        let planning = await Salles.getByKey(params.key)
        return { planning }
    } catch {
        throw error(404, "Salle introuvable ou planning indisponible")
    }
}