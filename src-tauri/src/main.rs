#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{collections::HashMap, sync::Arc};

use f_chat_rs::{
    cache::Cache,
    client::{Client, ClientBuilder},
    data::{self as f_data, Channel, ChannelData, Character, CharacterData, Message},
    protocol::Target,
};
use tauri::State;
use tokio::sync::{RwLock as AsyncRwLock, mpsc::Sender};

mod cache;
mod data;
mod event;

// https://github.com/tauri-apps/tauri/issues/2533
type AsyncVoid = Result<(), ()>;

// This is going to be used in almost every command.
struct MaybeClient {
    client: AsyncRwLock<Option<Arc<Client<event::EventHandler, cache::Cache>>>>, // This is ugly.
}
type ClientState<'a> = State<'a, MaybeClient>;

// client::ClientError is not yet Serialize, so cannot be used.
#[tauri::command]
async fn login(
    client: ClientState<'_>,
    emitter: State<'_, Sender<event::UpdateEvent>>,
    username: String,
    password: String,
) -> AsyncVoid {
    let (new_client, receiver) =
        ClientBuilder::new(event::EventHandler::new(emitter.inner().clone()))
            .with_version("Husky".to_string(), "0.1".to_string())
            .with_cache(cache::Cache::new())
            .init(username, password)
            .await
            .expect("Failed to init client -- Later, turn this into non-fatal.");
    let new_client = Arc::new(dbg!(new_client));
    *client.client.write().await = Some(new_client.clone());
    tokio::spawn(async move { new_client.start(receiver).await });

    Ok(())
}

#[tauri::command]
async fn start_session(client: ClientState<'_>, character: Character) -> AsyncVoid {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic... (start_session)");
    client
        .connect(character)
        .await
        .expect("Failed to connect character");
    Ok(())
}

#[tauri::command]
async fn get_own_characters(client: ClientState<'_>) -> Result<Vec<Character>, ()> {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic! (get_own_characters)");
    Ok(client.own_characters.clone())
}

#[tauri::command]
async fn get_friends(client: ClientState<'_>) -> Result<Vec<Character>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard.as_ref().expect("Too optimistic (get_friends)");

    client.cache.get_friends().map(|v| v.into_owned())
}

#[tauri::command]
async fn get_bookmarks(client: ClientState<'_>) -> Result<Vec<Character>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (get_bookmarks)");

    client.cache.get_bookmarks().map(|v| v.into_owned())
}

#[tauri::command]
async fn get_all_characters(
    client: ClientState<'_>,
) -> Result<HashMap<Character, data::CharacterDataInner>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (get_all_characters)");

    client.cache.get_characters().map(|v| {
        v.into_owned()
            .drain(..)
            .map(|v| {
                (v.character, data::CharacterDataInner {
                    status: v.status,
                    gender: v.gender,
                    status_message: v.status_message,
                })
            })
            .collect()
    })
}

#[tauri::command]
async fn get_character(
    client: ClientState<'_>,
    character: Character,
) -> Result<Option<CharacterData>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (get_character)");

    client.cache.get_character(&character)
}

#[tauri::command]
async fn get_channel(
    client: ClientState<'_>,
    channel: Channel,
) -> Result<Option<ChannelData>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard.as_ref().expect("Too optimistic (get_channel)");

    client.cache.get_channel(&channel)
}

#[tauri::command]
async fn get_sessions(client: ClientState<'_>) -> Result<Vec<Character>, ()> {
    let client_guard = client.client.read().await;
    Ok(client_guard.as_ref().map_or(Vec::new(), |client| {
        client
            .get_sessions()
            .drain(..)
            .map(|v| v.character)
            .collect()
    }))
}

#[tauri::command]
async fn get_recents(character: Character) -> Result<Vec<Character>, ()> {
    Ok(vec![]) // For now, this is not backed by anything.
    // Later, back this with a cache which is updated when messages are sent in DMs.
}

#[tauri::command]
async fn get_messages(
    client: ClientState<'_>,
    channel: MessageChannel,
) -> Result<Vec<Message>, cache::CacheError> {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (get_messages)");

    client
        .cache
        .get_messages(&channel.into(), None, Some(80))
        .map(|v| v.into_owned())
}

#[derive(serde::Deserialize, Debug)]
#[serde(untagged)]
// This is MessageChannel from f_chat_rs, but for a language without typed unions.
// Maybe at a later time I'll go back to f_chat_rs and redesign how these are all described.
enum MessageChannel {
    Channel {
        channel: Channel,
    },
    Character {
        own_character: Character,
        other_character: Character,
    },
}

impl From<MessageChannel> for f_data::MessageChannel {
    fn from(value: MessageChannel) -> Self {
        match value {
            MessageChannel::Channel { channel } => f_data::MessageChannel::Channel(channel),
            MessageChannel::Character {
                own_character,
                other_character,
            } => f_data::MessageChannel::PrivateMessage(own_character, other_character),
        }
    }
}

#[tauri::command]
async fn send_message(
    client: ClientState<'_>,
    session: Character,
    target: Target,
    message: String,
) -> AsyncVoid {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (send_message)");

    client
        .send_message(&session, target, message)
        .await
        .expect("Client error (send_message)");
    Ok(())
}

#[tauri::command]
async fn send_dice(
    client: ClientState<'_>,
    session: Character,
    target: Target,
    dice: String,
) -> AsyncVoid {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (send_dice)");

    let session = client
        .get_session(&session)
        .expect("Bad session provided (send_dice)");
    session
        .send_dice(target, dice)
        .await
        .expect("Client error (send_dice)");
    Ok(())
}

#[tauri::command]
async fn session_join_channel(
    client: ClientState<'_>,
    session: Character,
    channel: Channel,
) -> AsyncVoid {
    let client_guard = client.client.read().await;
    let client = client_guard
        .as_ref()
        .expect("Too optimistic (join_channel)");

    let session = client
        .get_session(&session)
        .expect("Bad session provided (join_channel)");
    session
        .join_channel(channel)
        .await
        .expect("Client error (join_channel)");
    Ok(())
}

#[tokio::main]
async fn main() {
    let client = MaybeClient {
        client: AsyncRwLock::new(None),
    };
    let (send, mut receive) = tokio::sync::mpsc::channel::<event::UpdateEvent>(8);

    // This isn't necessary but I want to control the async runtime
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .manage(client)
        .manage(send)
        .setup(|app| {
            // Oh, and here's where I read off the receiver.
            let handle = app.handle().clone();
            tokio::spawn(async move {
                while let Some(event) = receive.recv().await {
                    event::handle_event(&handle, event).await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            start_session,
            get_own_characters,
            get_friends,
            get_bookmarks,
            get_channel,
            get_character,
            get_all_characters,
            get_sessions,
            get_recents,
            get_messages,
            send_message,
            send_dice,
            session_join_channel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
