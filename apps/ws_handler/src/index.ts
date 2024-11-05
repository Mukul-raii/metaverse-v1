import WebSocket, { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const wss = new WebSocketServer({
  port: PORT,
});
// Now what we need to handle
// 1. User connects to / endpoint with the id of the user
// 2. User moves on the location

//  Task to handle write now
// handle when user connects the server

// authenticate the user is pending

const users: {
  id: string;
  x: number;
  y: number;
}[] = [];

function emit(ws: WebSocket, type: string, data: Record<string, any>) {
  ws.send(JSON.stringify({ type, data }));
}

const appendNewUser = (id: string) => {
  const user = { id: id, x: 0, y: 0 };
  users.push(user);
  return user;
};

function broadcast(
  wss: WebSocketServer,
  type: string,
  data: Record<string, any>
) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      emit(client, type, data);
    }//if the client is open emit the data (send it to the client)
  });
}


wss.on("connection", function connection(ws: WebSocket & { id: string }) {
  ws.id = uuidv4();
  emit(ws, "user_position", appendNewUser(ws.id));//as the connection is establishing sending the user position
  broadcast(wss, "users", users);
  broadcast(wss, "test_message", { message: `User connected: ${ws.id}` });

  ws.on("message", (message: any) => {
    try {
      const data = JSON.parse(message);
      if (!data["type"]) {
        emit(ws, "error", { message: "type is missing" });
      }
      switch (data["type"]) {
        
        case "move":
          const user = users.find((user) => user.id === data["id"]);
          if (!user) {
            emit(ws, "error", { message: "user not found" });
            return;
          }
          const updatedXChange = user.x - data["x"];
          const updatedYChange = user.y - data["y"];
          console.log(updatedXChange, updatedYChange);
          if (updatedXChange > 1 || updatedYChange > 1) {
            emit(ws, "user_position", user);
            return emit(ws, "error", {
              message: "user can't move more than 1",
            });
          }
          user.x = data["x"];
          user.y = data["y"];
          // update users position
          users.forEach((user, index) => {
            if (user.id === ws.id) {
              users[index] = user;
            }
          });
          emit(ws, "user_position", user);
          // users.forEach((user) => {
          //   // if (user.id !== ws.id) {
          //   emit(ws, "update_user", {
          //     id: user.id,
          //     x: user.x,
          //     y: user.y,
          //   });
          //   // }
          // });
          broadcast(wss, "update_user", {
            id: user.id,
            x: user.x,
            y: user.y,
          });
          break;

        default:
          emit(ws, "error", { message: "type is not valid" });
          break;
      }
    } catch (error) {
      console.log(error);
      console.log(`server got fired up`);
    }
  });
  ws.on("close", () => {
    // remove the user from the list
    const index = users.findIndex((user) => user.id === ws.id);
    users.splice(index, 1);
    broadcast(wss, "users", users);
    // emit(ws, "users", users);
  });
});
