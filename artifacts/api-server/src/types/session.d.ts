import "express-session";

declare module "express-session" {
  interface SessionData {
    repId: number;
    role: string;
    name: string;
  }
}
