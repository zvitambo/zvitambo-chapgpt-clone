import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
  runtime: "edge",
};

export default async function handler(req, res) {
  try {
    // console.log(req);
    const { chatId: chatIdFromParams, message } = await req.json();

    //validate message 
    if (!message ||typeof message !== "string") {
      return new Response({ message: "message is required"}, {status: 422});
    }
    if (message.length > 200) {
      return new Response(
        { message: "message must be less than 200 characters" },
        { status: 422 }
      );
    }
    let chatId = chatIdFromParams;
    let newChatId;
    let chatMessages;

    const initialChatMsg = {
      role: "system",
      content:
        "Your name is Zvitambo-AI. Your response must be formatted as markdown",
    };

    if (chatId) {
      //add message to existing chat
      const response = await fetch(
        `${req.headers.get("origin")}/api/chat/addMessageToChat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: req.headers.get("cookie"),
          },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: message,
          }),
        }
      );

      const json = await response.json();
      chatMessages = json.chat.messages || [];
    } else {
      const response = await fetch(
        `${req.headers.get("origin")}/api/chat/createNewChat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: req.headers.get("cookie"),
          },
          body: JSON.stringify({
            message,
          }),
        }
      );

      const json = await response.json();
      chatMessages = json.messages || [];
      chatId = json._id;
      newChatId = json._id;
    }

    const messagesToInclude = [];
    chatMessages.reverse();
    let usedTokens = 0;
    for (let chatMessage of chatMessages) {
      const messageToken = chatMessage.content.length / 4;
      usedTokens = usedTokens + messageToken;

      if (usedTokens <= process.env.HISTORY_TOKEN_LIMIT) {
        messagesToInclude.push(chatMessage);
      } else {
        break;
      }
    }
    messagesToInclude.reverse();
    const stream = await OpenAIEdgeStream(
      "https://api.openai.com/v1/chat/completions",
      {
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        method: "POST",
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [initialChatMsg, ...messagesToInclude],
          stream: true,
        }),
      },
      {
        onBeforeStream: async ({ emit }) => {
          if (newChatId) {
            emit(chatId, "NewChatId");
          }
        },
        onAfterStream: async ({ fullContent }) => {
          await fetch(
            `${req.headers.get("origin")}/api/chat/addMessageToChat`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: req.headers.get("cookie"),
              },
              body: JSON.stringify({
                chatId,
                role: "assistant",
                content: fullContent,
              }),
            }
          );
        },
      }
    );
    return new Response(stream);
    //console.log(res)
    // return res.json(new Response(stream));
  } catch (error) {
   return new Response(
     { message: "An error occured" },
     { status: 500 }
   );
  }
}
