use std::sync::Arc;

use chrono::Utc;
use tokio::sync::mpsc::Sender;

use f_chat_rs::{
    client::{EventListener, async_trait},
    data::{Channel, Character, Message, MessageChannel, MessageContent},
    session::Session,
};
use serde::Serialize;
use tauri::{Emitter, Runtime};

#[derive(Debug)]
pub struct EventHandler {
    update_emitter: Sender<UpdateEvent>,
}
impl EventHandler {
    pub fn new(update_emitter: Sender<UpdateEvent>) -> Self {
        EventHandler { update_emitter }
    }
}

#[derive(Debug)]
pub enum UpdateEvent {
    Bookmarks,
    Channel(Channel),
    Character(Character),
    Friends,

    Message(MessageChannel, Message),
}

#[derive(Debug, Serialize, Clone)]
pub struct EventMessage {
    channel: MessageChannel,
    message: Message,
}

#[async_trait]
impl EventListener for EventHandler {
    async fn message(
        &self,
        _ctx: Arc<Session>,
        channel: MessageChannel,
        character: Character,
        content: MessageContent,
    ) {
        self.update_emitter
            .send(UpdateEvent::Message(channel, Message {
                character,
                content,
                timestamp: Utc::now(),
            }))
            .await
            .expect("Event failed (message)");
    }

    async fn updated_friends(&self) {
        self.update_emitter
            .send(UpdateEvent::Friends)
            .await
            .expect("Event failed (updated_friends)");
    }
    async fn updated_bookmarks(&self) {
        self.update_emitter
            .send(UpdateEvent::Bookmarks)
            .await
            .expect("Event failed (updated_bookmarks)");
    }
    async fn updated_channel(&self, channel: Channel) {
        self.update_emitter
            .send(UpdateEvent::Channel(channel))
            .await
            .expect("Event failed (updated_channel)");
    }
    async fn updated_character(&self, user: Character) {
        self.update_emitter
            .send(UpdateEvent::Character(user))
            .await
            .expect("Event failed (updated_character)");
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct MessageEvent {
    from: String,
    to: String,
    pm: bool,
    content: String,
}

pub async fn handle_event<R: Runtime>(handle: &impl Emitter<R>, event: UpdateEvent) {
    match event {
        UpdateEvent::Bookmarks => handle.emit("update_bookmark", ()),
        UpdateEvent::Channel(chan) => handle.emit("update_channel", chan),
        UpdateEvent::Character(character) => handle.emit("update_character", character),
        UpdateEvent::Friends => handle.emit("update_friends", ()),
        UpdateEvent::Message(channel, message) => {
            handle.emit("message", EventMessage { channel, message })
        }
    }
    .expect("Failed to emit event");
}
