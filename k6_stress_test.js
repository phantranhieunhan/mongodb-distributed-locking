// import http from "k6/http";
// import { check, sleep } from "k6";

// export let options = {
//   vus: 5000, // Number of virtual users
//   duration: "1m", // Test duration
//   thresholds: {
//     http_req_duration: ["p(95)<100"], // Expecting: 95% of requests should be below 100ms
//   },
// };

// // Replace with a real user ID from your database
// const USER_ID = "6831cb7b4cd0817a631a5501"; // any User ID you have on your DB
// const BASE_URL = "http://localhost:3000";

// export default function () {
//   const res = http.get(`${BASE_URL}/user/${USER_ID}`);
//   check(res, {
//     "status is 200": (r) => r.status === 200,
//     "body has user": (r) => r.json().user !== undefined,
//   });
//   sleep(0.001); // Small sleep to help spread requests
// }

