import type OpenAI from "openai";

export const LICKY_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_booking_status",
      description:
        "See what booking details we already have (slot, address, phone, pet) and what is still missing. Call when booking or when the client asks what's needed.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_appointments",
      description:
        "List the client's upcoming confirmed appointments with ids, times, groomers, and pets. Logged-in clients only.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "List open booking slots. Also shows tap-to-book buttons in chat. Use when exploring options or no specific time was requested.",
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
      name: "find_slot",
      description:
        "Match the client's words to a real open slot (e.g. 'next Tuesday morning with Melanie'). Returns slot_key values for book_appointment. Shows matching buttons when possible.",
      parameters: {
        type: "object",
        properties: {
          preference: {
            type: "string",
            description:
              "What they asked for in natural language, e.g. 'July 12 afternoon with Diamond'",
          },
          service: {
            type: "string",
            enum: ["full-groom", "bath-brush"],
          },
          groomer_id: {
            type: "string",
            enum: ["melanie", "diamond"],
          },
          date: {
            type: "string",
            description: "Optional YYYY-MM-DD if they gave an exact date",
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
        "Get list and discounted grooming prices for a dog size and service. Uses locked-in discount when applicable.",
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
      name: "save_client_address",
      description:
        "Save the client's mobile grooming service address. Call whenever they give street, city, and zip — even mid-conversation.",
      parameters: {
        type: "object",
        properties: {
          full_address: {
            type: "string",
            description: "Full address like '123 Main St, Irvine, 92618'",
          },
          address: { type: "string" },
          city: { type: "string" },
          zip_code: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_guest_contact",
      description:
        "Save guest name, phone, and pet details for booking when they are not logged in.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          phone: { type: "string" },
          pet_name: { type: "string" },
          pet_size: {
            type: "string",
            enum: ["small", "medium", "large"],
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book grooming when you have a slot_key and required details. Collect missing address/phone through conversation first, or pass them here. Holds the slot automatically.",
      parameters: {
        type: "object",
        properties: {
          slot_key: {
            type: "string",
            description: "From find_slot or check_availability",
          },
          service: { type: "string", enum: ["full-groom", "bath-brush"] },
          full_address: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          phone: { type: "string" },
          pet_name: { type: "string" },
          pet_size: {
            type: "string",
            enum: ["small", "medium", "large"],
          },
        },
        required: ["slot_key"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "Cancel a client's appointment. First call with confirmed=false to preview; only set confirmed=true after explicit client agreement.",
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
        "Move an appointment to a new slot from find_slot/check_availability. First call with confirmed=false; confirmed=true only after client confirms.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string" },
          slot_key: {
            type: "string",
            description: "From find_slot or check_availability",
          },
          confirmed: { type: "boolean" },
        },
        required: ["appointment_id", "slot_key"],
        additionalProperties: false,
      },
    },
  },
];
