export type Character = string;
export type Channel = string;
export type ChannelData = {
  channelMode: string,
  members: Set<Character>,
  description: string,
  title: string,
}
export type CharacterData = {
  gender: string,
  status: string,
  statusMessage: string
}
export type MessageChannel = { own_character: Character, other_character: Character } | { channel: Channel };
export type MessageTarget = { recipient: Character } | { channel: Channel }
export type MessageContent
  = { type: "message", content: string }
  | { type: "emote", content: string }
  | { type: "roll", content: [string[], number[], number] }
  | { type: "bottle", content: Character }
export type Message = {
  timestamp: number,
  character: Character,
  content: MessageContent
}
