import type OpenAI from "openai";

export const LICKY_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_upcoming_appointments",
      description:
        "List the client's upcoming confirmed appointments with appointment ids, times, groomers, and pets.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Check real open booking slots for dog grooming. Returns dates, times, groomer names, and slot_key for rescheduling.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            enum: ["full-groom", "bath-brush"],
            description: "Grooming service type",
          },
          days: {
            type: "number",
            description: "How many days ahead to search (1-30, default 14)",
          },
          groomer_id: {
            type: "string",
            enum: ["melanie", "diamond"],
            description: "Optional filter to one groomer",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pricing",
      description:
        "Get list and discounted grooming prices for a dog size and service. Uses client's locked-in discount when applicable.",
      parameters: {
        type: "object",
        properties: {
          pet_size: {
            type: "string",
            enum: ["small", "medium", "large"],
            description: "Dog size tier",
          },
          service: {
            type: "string",
            enum: ["full-groom", "bath-brush"],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_area",
      description:
        "Describe Mobile Dog Salon service area: Orange County and select LA County communities.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "Cancel a client's appointment. First call with confirmed=false to preview; only set confirmed=true after the client explicitly agrees.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string" },
          confirmed: {
            type: "boolean",
            description: "Must be true only after explicit client confirmation",
          },
        },
        required: ["appointment_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_appointment",
      description:
        "Move an appointment to a new slot from check_availability. First call with confirmed=false; set confirmed=true only after client confirms the new time.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string" },
          slot_key: {
            type: "string",
            description: "From check_availability, format groomerId|YYYY-MM-DD|HH:mm",
          },
          confirmed: { type: "boolean" },
        },
        required: ["appointment_id", "slot_key"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book grooming when client chose a slot_key. UI buttons handle booking.",
      parameters: {
        type: "object",
        properties: {
          slot_key: { type: "string" },
          service: { type: "string", enum: ["full-groom", "bath-brush"] },
        },
        required: ["slot_key"],
        additionalProperties: false,
      },
    },
  },
];
