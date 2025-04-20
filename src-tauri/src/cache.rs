use std::borrow::Cow;

use chrono::Utc;
use dashmap::{DashMap, DashSet};
use f_chat_rs::{
    cache::{PartialChannelData, PartialUserData},
    data::{
        Channel, ChannelData, ChannelMode, Character, CharacterData, FriendRelation, Gender,
        Message, MessageChannel, MessageContent, Status,
    },
    util::Timestamp,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Default)]
pub struct Cache {
    channels: DashMap<Channel, CacheChannelData>,
    characters: DashMap<Character, CacheCharacterData>,
    messages: DashMap<MessageChannel, Vec<Message>>,
    ads: DashMap<Channel, Vec<Message>>,
    bookmarks: DashSet<Character>,
    friends: DashSet<FriendRelation>,
    admins: DashSet<Character>,
    global_channels: DashMap<Channel, u32>,
    unofficial_channels: DashMap<Channel, u32>,
}

#[derive(Debug, Default)]
struct CacheChannelData {
    pub mode: ChannelMode,
    pub members: DashSet<Character>,
    pub ops: DashSet<Character>,
    pub description: String,
    pub title: String,
}

#[derive(Debug, Default)]
struct CacheCharacterData {
    pub gender: Gender,
    pub status: Status,
    pub status_message: String,
}

impl Cache {
    pub fn new() -> Self {
        Default::default()
    }
}

#[derive(Error, Debug, Serialize)]
pub enum CacheError {}

impl f_chat_rs::cache::Cache for Cache {
    type Error = CacheError;

    fn insert_message(
        &self,
        source: MessageChannel,
        message: Message,
    ) -> Result<bool, Self::Error> {
        let mut messages = self.messages.entry(source).or_insert(Vec::new());
        if messages.last() == Some(&message) {
            Ok(false)
        } else {
            messages.push(message);
            Ok(true)
        }
    }

    fn insert_channel(
        &self,
        channel: Cow<Channel>,
        data: PartialChannelData,
        members: Cow<[Character]>,
    ) -> Result<bool, Self::Error> {
        if self.channels.contains_key(&channel) {
            // If it already exists, it should be consistent.
            Ok(false)
        } else {
            self.channels
                .insert(channel.into_owned(), CacheChannelData {
                    mode: data.mode.unwrap_or_default(),
                    members: members.iter().cloned().collect(),
                    description: data.description.unwrap_or_default().into_owned(),
                    title: data.title.unwrap_or_default().into_owned(),
                    ops: DashSet::new(),
                });
            Ok(true)
        }
    }

    fn insert_ad(
        &self,
        channel: Cow<Channel>,
        character: Cow<Character>,
        ad: Cow<str>,
    ) -> Result<bool, Self::Error> {
        let mut ads = self.ads.entry(channel.into_owned()).or_default();
        if let Some(Message {
            content: MessageContent::Message(inner_ad),
            ..
        }) = ads.last()
        {
            if inner_ad == ad.as_ref() {
                return Ok(false);
            }
        }
        ads.push(Message {
            timestamp: Utc::now(),
            character: character.into_owned(),
            content: MessageContent::Message(ad.into_owned()),
        });
        Ok(true)
    }

    fn add_channel_member(
        &self,
        channel: Cow<Channel>,
        member: Character,
    ) -> Result<bool, Self::Error> {
        if let Some(chan) = self.channels.get(&channel) {
            Ok(chan.members.insert(member))
        } else {
            Ok(false)
        }
    }

    fn remove_channel_member(
        &self,
        channel: Cow<Channel>,
        member: Character,
    ) -> Result<bool, Self::Error> {
        if let Some(chan) = self.channels.get(&channel) {
            Ok(chan.members.remove(&member).is_some())
        } else {
            Ok(false)
        }
    }

    fn add_bookmark(&self, character: Cow<Character>) -> Result<bool, Self::Error> {
        Ok(self.bookmarks.insert(character.into_owned()))
    }

    fn remove_bookmark(&self, character: Cow<Character>) -> Result<bool, Self::Error> {
        Ok(self.bookmarks.remove(&character).is_some())
    }

    fn add_global_op(&self, character: Cow<Character>) -> Result<bool, Self::Error> {
        Ok(self.admins.insert(character.into_owned()))
    }

    fn remove_global_op(&self, character: Cow<Character>) -> Result<bool, Self::Error> {
        Ok(self.admins.remove(&character).is_some())
    }

    fn add_channel_op(
        &self,
        channel: Cow<Channel>,
        character: Cow<Character>,
    ) -> Result<bool, Self::Error> {
        if let Some(chan) = self.channels.get(&channel) {
            Ok(chan.ops.insert(character.into_owned()))
        } else {
            Ok(false)
        }
    }

    fn remove_channel_op(
        &self,
        channel: Cow<Channel>,
        character: Cow<Character>,
    ) -> Result<bool, Self::Error> {
        if let Some(chan) = self.channels.get(&channel) {
            Ok(chan.ops.remove(&character).is_some())
        } else {
            Ok(false)
        }
    }

    fn update_channel(
        &self,
        channel: Cow<Channel>,
        data: PartialChannelData,
    ) -> Result<bool, Self::Error> {
        let mut changed = false;
        self.channels.entry(channel.into_owned()).and_modify(|v| {
            if let Some(title) = data.title {
                if &title != &v.title {
                    changed = true;
                    v.title = title.into_owned();
                }
            }
            if let Some(desc) = data.description {
                if &desc != &v.description {
                    changed = true;
                    v.description = desc.into_owned();
                }
            }
            if let Some(mode) = data.mode {
                if mode != v.mode {
                    changed = true;
                    v.mode = mode;
                }
            }
        });
        Ok(changed)
    }

    fn update_character(
        &self,
        character: Cow<Character>,
        data: PartialUserData,
    ) -> Result<bool, Self::Error> {
        let mut changed = false;
        let mut v = self.characters.entry(character.into_owned()).or_default();
        if let Some(gender) = data.gender {
            if v.gender != gender {
                changed = true;
                v.gender = gender;
            }
        }
        if let Some(status) = data.status {
            if v.status != status {
                changed = true;
                v.status = status;
            }
        }
        if let Some(message) = data.status_message {
            if &v.status_message != &message {
                changed = true;
                v.status_message = message.into_owned();
            }
        }
        Ok(changed)
    }

    fn set_friends(&self, friends: Cow<[FriendRelation]>) -> Result<bool, Self::Error> {
        // This is lazy and will always update. Come up with a smarter way later.
        self.friends.clear();
        for v in friends.into_owned().drain(..) {
            self.friends.insert(v);
        }
        Ok(true)
    }

    fn set_bookmarks(&self, bookmarks: Cow<[Character]>) -> Result<bool, Self::Error> {
        // This is also lazy and will always update.
        self.bookmarks.clear();
        for v in bookmarks.into_owned().drain(..) {
            self.bookmarks.insert(v);
        }
        Ok(true)
    }

    fn set_channel_members(
        &self,
        channel: Cow<Channel>,
        members: Cow<[Character]>,
    ) -> Result<bool, Self::Error> {
        // Later, evaluate the performance impact of updating every time vs checking the set union
        let chan = self.channels.entry(channel.into_owned()).or_default();
        chan.members.clear();
        // Alternative method -- Create set from input, insert all into members and retain.
        // Other alternative method is to swap out the whole set... But I'm not so keen.
        for v in members.into_owned().drain(..) {
            chan.members.insert(v);
        }
        Ok(true)
    }

    fn set_global_channels(&self, channels: Cow<[(Channel, u32)]>) -> Result<bool, Self::Error> {
        let mut changed = false;
        for (channel, count) in channels.into_owned().drain(..) {
            changed = self.global_channels.insert(channel, count).is_some() || changed;
        }
        Ok(changed)
    }

    fn set_unofficial_channels(
        &self,
        channels: Cow<[(Channel, u32)]>,
    ) -> Result<bool, Self::Error> {
        // Caveat - I'm never cleaning up old channels. Bad idea, yes. Problem? Probably not, realistically - Low pop count.
        let mut changed = false;
        for (channel, count) in channels.into_owned().drain(..) {
            changed = self.unofficial_channels.insert(channel, count).is_some() || changed;
        }
        Ok(changed)
    }

    fn set_global_ops(&self, ops: Cow<[Character]>) -> Result<bool, Self::Error> {
        self.admins.clear();
        for admin in ops.into_owned().drain(..) {
            self.admins.insert(admin);
        }
        Ok(true)
    }

    fn set_channel_ops(
        &self,
        channel: Cow<Channel>,
        ops: Cow<[Character]>,
    ) -> Result<bool, Self::Error> {
        let chan = self.channels.entry(channel.into_owned()).or_default();
        chan.ops.clear();
        for op in ops.into_owned() {
            chan.ops.insert(op);
        }
        Ok(true)
    }

    fn get_channel(&self, channel: &Channel) -> Result<Option<ChannelData>, Self::Error> {
        // Because we use CacheChannelData, we can't just return a copy of what's in the cache.
        Ok(self.channels.get(channel).map(|v| ChannelData {
            channel: channel.to_owned(),
            channel_mode: v.mode,
            members: v.members.iter().map(|v| v.to_owned()).collect(),
            description: v.description.clone(),
            title: v.title.clone(),
        }))
    }

    fn get_channels(&self) -> Result<Cow<[ChannelData]>, Self::Error> {
        // Like get_channel, but even more expensive...
        Ok(self
            .channels
            .iter()
            .map(|v| ChannelData {
                channel: v.key().to_owned(),
                channel_mode: v.mode,
                members: v.members.iter().map(|v| v.to_owned()).collect(),
                description: v.description.clone(),
                title: v.title.clone(),
            })
            .collect())
    }

    fn get_character(&self, character: &Character) -> Result<Option<CharacterData>, Self::Error> {
        Ok(self.characters.get(character).map(|v| CharacterData {
            character: *character,
            gender: v.gender,
            status: v.status,
            status_message: v.status_message.clone(),
        }))
    }

    fn get_characters(&self) -> Result<Cow<[CharacterData]>, Self::Error> {
        Ok(self
            .characters
            .iter()
            .map(|v| CharacterData {
                character: *v.key(),
                gender: v.gender,
                status: v.status,
                status_message: v.status_message.clone(),
            })
            .collect())
    }

    fn get_messages(
        &self,
        source: &MessageChannel,
        since: Option<Timestamp>,
        limit: Option<u32>,
    ) -> Result<Cow<[Message]>, Self::Error> {
        // This disregards "since" for the moment and is incomplete as a result.
        // This will become obvious once I try to use it...
        Ok(self
            .messages
            .get(source)
            .map(|messages| {
                messages
                    .iter()
                    .rev()
                    .take(limit.unwrap_or(80).try_into().unwrap())
                    .map(|v| v.clone())
                    .rev()
                    .collect()
                // This is really stupid and I should just slice from the back and clone.
            })
            .map_or(Default::default(), |v| Cow::Owned(v)))
    }

    fn get_friend_relations(&self) -> Result<Cow<[FriendRelation]>, Self::Error> {
        Ok(self.friends.iter().map(|v| v.clone()).collect())
    }

    fn get_bookmarks(&self) -> Result<Cow<[Character]>, Self::Error> {
        Ok(self.bookmarks.iter().map(|v| v.clone()).collect())
    }
}
