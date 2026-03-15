import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { IconButton } from "@mui/material";
import MessageOthers from "./MessageOthers";
import MessageSelf from "./MessageSelf";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import io from "socket.io-client";

const ENDPOINT = process.env.REACT_APP_SERVER_URL || "http://localhost:8080";

// Single persistent socket — created once outside the component
var socket = io(ENDPOINT);

function ChatArea() {
    const lightTheme = useSelector((state) => state.themeKey);
    const [messageContent, setMessageContent] = useState("");
    const messagesEndRef = useRef(null);
    const dyParams = useParams();
    const [chat_id, chat_user] = dyParams._id.split("&");
    const userData = JSON.parse(localStorage.getItem("userData"));
    const [allMessages, setAllMessages] = useState([]);
    const { refresh, setRefresh } = useContext(myContext);
    const [loaded, setloaded] = useState(false);
    // Per-chat message cache so switching is instant on revisit
    const chatCacheRef = useRef({});

    // ── 1. Socket setup: done once per component mount ──────────────────────
    useEffect(() => {
        socket.emit("setup", userData);
        // No cleanup needed for "setup" — it's a one-shot event
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 2. Join correct room, leave old one to prevent message bleed ────────
    const prevChatId = useRef(null);
    useEffect(() => {
        if (prevChatId.current && prevChatId.current !== chat_id) {
            socket.emit("leave chat", prevChatId.current);
        }
        socket.emit("join chat", chat_id);
        prevChatId.current = chat_id;
    }, [chat_id]);

    // ── 3. Listen for incoming messages — cleaned up on every re-attach ──────
    useEffect(() => {
        const handleNewMessage = (newMessage) => {
            // Only append if the message belongs to our current chat
            if (newMessage.chat?._id === chat_id) {
                setAllMessages((prev) => [...prev, newMessage]);
                // Invalidate cache for this chat so next fetch is fresh
                chatCacheRef.current[chat_id] = undefined;
            }
            setRefresh((r) => !r);
        };

        socket.on("message received", handleNewMessage);
        return () => {
            socket.off("message received", handleNewMessage);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat_id]);

    // ── 4. Fetch messages – only when chat_id or refresh changes ────────────
    useEffect(() => {
        // Show cache instantly while real request runs in background
        if (chatCacheRef.current[chat_id]) {
            setAllMessages(chatCacheRef.current[chat_id]);
            setloaded(true);
        } else {
            setloaded(false);
            setAllMessages([]);
        }

        const config = {
            headers: {
                Authorization: `Bearer ${userData.data.token}`,
            },
        };
        axios
            .get(`${ENDPOINT}/message/` + chat_id, config)
            .then(({ data }) => {
                setAllMessages(data);
                chatCacheRef.current[chat_id] = data;   // update cache
                setloaded(true);
            })
            .catch((err) => {
                console.error("Fetch messages failed:", err.message);
                setloaded(true); // stop loading even on error
            });
    // ⚠️ allMessages intentionally excluded — adding it causes infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat_id, refresh]);

    // ── 5. Send a message ────────────────────────────────────────────────────
    const sendMessage = useCallback(() => {
        if (!messageContent.trim()) return;
        const config = {
            headers: {
                Authorization: `Bearer ${userData.data.token}`,
            },
        };
        axios
            .post(
                `${ENDPOINT}/message/`,
                { content: messageContent, chatId: chat_id },
                config
            )
            .then(({ data }) => {
                socket.emit("newMessage", data);
                setRefresh((r) => !r);
            })
            .catch((err) => {
                console.error("Send message failed:", err.message);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messageContent, chat_id]);

    // ── Render ────────────────────────────────────────────────────────────────
    if (!loaded) {
        return (
            <div
                style={{
                    padding: "10px",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px" }} height={60} />
                <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px", flexGrow: "1" }} />
                <Skeleton variant="rectangular" sx={{ width: "100%", borderRadius: "10px" }} height={60} />
            </div>
        );
    }

    return (
        <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
            <div className={"chatArea-header" + (lightTheme ? "" : " dark")}>
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>{chat_user[0]}</p>
                <div className={"header-text" + (lightTheme ? "" : " dark")}>
                    <p className={"con-title" + (lightTheme ? "" : " dark")}>{chat_user}</p>
                </div>
                <IconButton className={"icon" + (lightTheme ? "" : " dark")}>
                    <DeleteIcon />
                </IconButton>
            </div>

            <div className={"messages-container" + (lightTheme ? "" : " dark")}>
                {allMessages
                    .slice(0)
                    .reverse()
                    .map((message, index) => {
                        const sender = message.sender;
                        const self_id = userData.data._id;
                        if (!sender) return null;
                        if (sender._id === self_id) {
                            return <MessageSelf props={message} key={index} />;
                        } else {
                            return <MessageOthers props={message} key={index} />;
                        }
                    })}
            </div>

            <div ref={messagesEndRef} className="BOTTOM" />
            <div className={"text-input-area" + (lightTheme ? "" : " dark")}>
                <input
                    placeholder="Type a Message"
                    className={"search-box" + (lightTheme ? "" : " dark")}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(event) => {
                        if (event.code === "Enter") {
                            sendMessage();
                            setMessageContent("");
                        }
                    }}
                />
                <IconButton
                    className={"icon" + (lightTheme ? "" : " dark")}
                    onClick={() => {
                        sendMessage();
                        setMessageContent("");
                    }}
                >
                    <SendIcon />
                </IconButton>
            </div>
        </div>
    );
}

export default ChatArea;