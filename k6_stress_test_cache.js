import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 500,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<100"],
  },
};

// Replace with a real user ID from your database
const USER_ID = "6831cb7b4cd0817a631a5501"; // any User ID you have on your DB
const BASE_URL = "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/user-cache/${USER_ID}?redlock=true`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has user": (r) => r.json().user !== undefined,
    "read from mongodb": (r) => r.json().source === "mongodb",
    "read from redis without waitting": (r) =>
      r.json().source === "redis" && r.json().waited === false,
    "read from redis and have to wait": (r) =>
      r.json().source === "redis" && r.json().waited === true,
  });
  sleep(0.001);
}
