import { attendanceEvents } from "@/lib/attendance-events";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const handler = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      attendanceEvents.on("update", handler);

      req.signal.addEventListener("abort", () => {
        attendanceEvents.off("update", handler);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
