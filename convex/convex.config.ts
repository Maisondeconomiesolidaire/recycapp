import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    STRIPE_SECRET_KEY: v.optional(v.string()),
  },
});
