import { handle, fail } from "@/lib/api";
const missing = handle(async () => fail("API endpoint not found.", 404));
export {
  missing as GET,
  missing as POST,
  missing as PATCH,
  missing as PUT,
  missing as DELETE,
};
