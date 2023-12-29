import {handleAuth, handleLogin} from "@auth0/nextjs-auth0";

export default handleAuth({
  signup: handleLogin({ authorizationParams: { screen_hint: "signup" } }),
});

// export default handleAuth({
//   async login(req, res) {
//     await handleLogin(req, res, {
//       authorizationParams: {
//         screen_hint: "signup",
//       },
//     });
//   },
// });