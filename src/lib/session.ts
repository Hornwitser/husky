import { derived, get, writable } from "svelte/store";
import * as rust from "./rust";
import type { Channel, Character, MessageTarget } from "./types";
import { browser } from "$app/environment";

export const sessions = writable<string[]>([]);
export const currentSession = derived(sessions, $sessions => $sessions.at(0) ?? null);

export const sessionPMs = writable<Record<Character, Set<Character>>>({});
export const sessionChannels = writable<Record<Character, Set<Channel>>>({});

if (browser) rust.getSessions().then((v) => sessions.set(v));

export function changeSession(newSession: string) {
  sessions.update((v) => {
    let swapIndex = v.indexOf(newSession);
    if (swapIndex < 0) {
      // This session doesn't exist!
      throw new Error(`No such session ${newSession}`);
    } else if (swapIndex > 0) {
      // We need to swap it (0 means it's already active)
      let oldPrimary = v[0];
      v[0] = v[swapIndex];
      v[swapIndex] = oldPrimary;
    }
    return v;
  });
}

function thisSession() {
  let session = get(currentSession);
  if (session === null) throw new Error("No active session but attempted to perform session action");
  return session;
}

export async function sendMessage(target: MessageTarget, message: string) {
  await rust.sendMessage(thisSession(), target, message);
}

export async function sendDice(target: MessageTarget, dice: string) {
  await rust.sendDice(thisSession(), target, dice);
}

export async function joinChannel(channel: Channel) {
  await rust.joinChannel(thisSession(), channel);
}

// Semantically, this just "shows" the PM
export function startPM(character: Character) {
  sessionPMs.update((v) => {
    let session = thisSession();
    let sessionData = v[session] ?? new Set();
    sessionData.add(character);

    v[session] = sessionData;
    return v;
  })
}

export function closePM(character: Character) {
  sessionPMs.update((v) => {
    let session = thisSession();
    let sessionData = v[session] ?? new Set();
    sessionData.delete(character);

    v[session] = sessionData;
    return v;
  })
}
