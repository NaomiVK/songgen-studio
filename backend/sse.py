import json
import asyncio
from typing import AsyncGenerator


async def sse_generator(
    event_queue: asyncio.Queue,
    timeout: float = 600.0
) -> AsyncGenerator[str, None]:
    """
    Generate SSE events from a queue.

    Args:
        event_queue: Queue containing (event_type, data) tuples
        timeout: Maximum time to wait for events (default 10 minutes)
    """
    try:
        while True:
            try:
                event_type, data = await asyncio.wait_for(
                    event_queue.get(),
                    timeout=timeout
                )

                # Format as SSE
                yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

                # Check for terminal events
                if event_type in ("done", "error"):
                    break

            except asyncio.TimeoutError:
                # Send keepalive
                yield f": keepalive\n\n"

    except asyncio.CancelledError:
        yield f"event: error\ndata: {json.dumps({'message': 'Connection cancelled'})}\n\n"


def format_sse_event(event_type: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
