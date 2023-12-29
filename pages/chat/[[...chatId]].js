import Head from "next/head";
import { streamReader } from "openai-edge-stream";
import { useEffect, useState } from "react";
import { ChatSidebar } from "./../../components/chatsidebar/ChatSidebar";
import { v4 as uuid } from "uuid";
import { Message } from "./../../components/message";
import { useRouter } from "next/router";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

export default function ChatPage({ chatId, title, messages = [] }) {
  const [messageText, setMessageText] = useState("");
  const [fullMessage, setFullMessage] = useState("");
  const [incomingMessageText, setIncomingMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [newChatId, setNewChatId] = useState(null);
  const [originalChatId, setOriginalChatId] = useState(chatId);
  const router = useRouter();

  const routeHasChanged = chatId !== originalChatId;

  //reset state items when route changes
  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  //save the newly streamed message to chat messages
  useEffect(() => {
    if (!routeHasChanged && !generatingResponse && fullMessage) {
      setNewChatMessages((prev) => {
        return [
          ...prev,
          { _id: uuid(), role: "assistant", content: fullMessage },
        ];
      });
      setFullMessage("");
    }
  }, [generatingResponse, fullMessage, routeHasChanged]);

  //if we created a new chat
  useEffect(() => {
    if (!generatingResponse && newChatId) {
      setNewChatId(null);
      router.push(`/chat/${newChatId}`);
    }
  }, [generatingResponse, newChatId, router]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneratingResponse(true);
    setOriginalChatId(chatId);
    setNewChatMessages((prev) => {
      const newChatMessages = [
        ...prev,
        {
          _id: uuid(),
          role: "user",
          content: messageText,
        },
      ];

      return newChatMessages;
    });

    const response = await fetch("/api/chat/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        message: messageText,
      }),
    });

    setMessageText("");
    const data = response.body;
    //const data = await response.json();

    if (!data) {
      return;
    }
    const reader = data.getReader();
    let content = "";
    await streamReader(reader, async (message) => {
      console.log("Message", message);

      if (message.event === "NewChatId") {
        setNewChatId(message.content);
      } else {
        setIncomingMessageText((s) => `${s}${message.content}`);
        content = content + message.content;
      }
    });
    setFullMessage(content);
    setIncomingMessageText("");
    setGeneratingResponse(false);
  };

  const allMessages = [...messages, ...newChatMessages];
  return (
    <div>
      <Head>
        <title>New Chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="flex flex-col overflow-hidden bg-gray-700">
          <div className="flex flex-1 flex-col-reverse overflow-scroll text-white">
            {!allMessages.length && !incomingMessageText && (
              <div className="m-auto flex items-center justify-center text-center">
                <div>
                  <FontAwesomeIcon
                    icon={faRobot}
                    className="mb-2 text-6xl text-emerald-200"
                  />
                  <h1 className="mt-2 text-4xl font-bold text-white">
                    Ask me a question !
                  </h1>
                </div>
              </div>
            )}

            {!!allMessages.length && (
              <div className="mb-auto">
                {allMessages.map((message) => {
                  return (
                    <Message
                      key={message._id}
                      role={message.role}
                      content={message.content}
                    />
                  );
                })}

                {!!incomingMessageText && !routeHasChanged && (
                  <Message role="assistant" content={incomingMessageText} />
                )}

                {!!incomingMessageText && !!routeHasChanged && (
                  <Message
                    role="notice"
                    content="Only one message at a time, Please allow for the current streaming response to complete before sending new message"
                  />
                )}
              </div>
            )}
          </div>
          <footer className="bg-gray-800 p-10">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-emerald-500 focus:bg-gray-600 focus:outline focus:outline-emerald-500"
                  placeholder={generatingResponse ? "" : "Send A message ..."}
                />
                <button type="submit" className="btn">
                  Send{" "}
                </button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </div>
  );
}
export const getServerSideProps = async (context) => {
  const chatId = context.params?.chatId?.[0] || null;

  if (chatId) {
    let objectId;
    try {
      objectId = new ObjectId(chatId);
    } catch (error) {
      return {
        redirect: {
          destination: "/chat",
        },
      };
    }
    const { user } = await getSession(context.req, context.res);
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id: objectId,
    });

    if (!chat) {
      return {
        redirect: {
          destination: "/chat",
        },
      };
    }

    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map((message) => ({
          ...message,
          _id: uuid(),
        })),
      },
    };
  }

  return {
    props: {},
  };
};
