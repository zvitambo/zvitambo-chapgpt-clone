import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const { user } = await getSession(req, res);
    const { chatId, role, content } = req.body;
    let objectId;
    try {
      objectId = new ObjectId(chatId);
    } catch (error) {
      res
        .status(422)
        .json({ message: "invalid chat ID" });
      return;
    }

     if (!content || typeof content !== "string") {
       res.status(422).json({ message: "content is required" });
       return;
     }
     if (
       (role === "user" && content.length > 200) ||
       (role === "assistant" && content.length > 150000)
     ) {
       res
         .status(422)
         .json({ message: "content must be less than 200 characters" });
       return;
     }

        if (role !== "user" && role !== "assistant") {
          res
            .status(422)
            .json({ message: "role must be either user or assistant" });
          return;
        }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const chat = await db.collection("chats").findOneAndUpdate(
      {
        _id: objectId,
        userId: user.sub,
      },
      {
        $push: {
          messages: {
            role,
            content,
          },
        },
      },
      {
        returnDocument: "after",
      }
    );
    res.status(200).json({
      chat: { ...chat.value, _id: chat.value._id.toString()},
    });
  } catch (error) {
    res.status(500).json({ message: "An error occurred creating a new chat" });
    console.log(error);
  }
}
