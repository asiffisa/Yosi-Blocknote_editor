# **PRD: Yosi AI Integration (Pure BlockNote SDK)**

Version: 2.0 (Native Transport Edition)  
Status: Ready for Implementation  
Objective: Integrate a robust AI layer into the Yosi Editor using only the BlockNote AI SDK (@blocknote/xl-ai). This implementation bypasses Vercel AI SDK entirely, using a custom ChatTransport to handle streaming, custom prompts, and model switching (DeepSeek/GPT-4).

## **1\. The Core Strategy: "Client-Side Transport"**

We will use the **Client-Side Transport** pattern provided by BlockNote. This involves writing a class that implements the ChatTransport interface. This class is responsible for:

1. Taking the user's input from the editor.  
2. Sending it to our secure Next.js API route (/api/ai/chat).  
3. Manually reading the raw response stream.  
4. Converting that stream into BlockNote's expected format (text-start, text-delta, finish).

**Why this wins:** It removes the "Black Box" of Vercel's protocol. You own the stream parsing line-by-line.

## **2\. Key Features & Requirements**

### **Feature A: Global API Key Settings (BYOK)**

**User Story:** "As a user, I want to enter my DeepSeek or OpenAI API key so I can use the AI features without a subscription."

* **UI Placement:** Top-right corner of the Home/Canvas page (Sun/Moon icon area).  
* **Component:** ApiKeyDialog (Shadcn Dialog).  
* **Functionality:**  
  * Inputs: API Key and Model Provider (Dropdown: DeepSeek / OpenAI).  
  * Storage: localStorage (Client-side only for privacy).  
  * Access: The ZenEditor component reads these values and passes them to the Transport class.

### **Feature B: Custom AI Menu Items (The "Thinking" Tools)**

**User Story:** "I want specific Yosi commands in the / menu."

* **Integration:** We will inject custom items into the BlockNote AI Menu.  
* **Commands:**  
  1. **Fix Grammar:** "Fix grammar/spelling. Maintain original tone."  
  2. **Make Professional:** "Rewrite to be formal and concise."  
  3. **Simplify:** "Rewrite for a 5th-grade reading level."  
  4. **Translate to Tamil:** "Translate text to Tamil."  
  5. **Custom Prompt:** Standard input field for freeform requests.

## **3\. Technical Architecture & File Structure**

### **1\. The Custom Transport (The Engine)**

**File:** packages/ui/components/editor/ai/custom-transport.ts

* **Class:** YosiTransport implements ChatTransport.  
* **Logic:**  
  * sendMessages(): Fetches from your API.  
  * **Stream Reader:** A while(true) loop that reads value from the stream reader.  
  * **Encoder:** Calls controller.enqueue with { type: "text-delta", content: chunk } as data arrives.

### **2\. The Custom Menu Items**

**File:** packages/ui/components/editor/ai/custom-commands.ts

* **Function:** getCustomAIMenuItems(editor).  
* **Logic:** Defines the icons and "System Prompts" for each custom command (Grammar, Simplify, etc.) using the filtering API from BlockNote.

### **3\. The Backend Route**

**File:** apps/web/app/api/ai/chat/route.ts

* **Imports:** import OpenAI from "openai".  
* **Role:** A dumb proxy. It takes the key from the client and forwards the request to the LLM provider, then pipes the response back.

### **4\. The Editor Integration**

**File:** apps/web/components/editor/zen-editor.tsx

* **Initialization:**  
  const transport \= new YosiTransport({  
    apiKey: storedKey,  
    model: storedModel  
  });

  const editor \= useCreateBlockNote({  
    ai: {  
      transport,  
      menuItems: getCustomAIMenuItems // Inject custom commands here  
    }  
  });

## **4\. Implementation Checklist (For AI Agent)**

1. \[ \] **Install Dependencies:** pnpm add @blocknote/xl-ai openai (Remove ai / Vercel SDK if present).  
2. \[ \] **Create Transport:** Implement YosiTransport class following the "Client Side Transport" example.  
3. \[ \] **Create Commands:** Define the custom menu items in a separate file.  
4. \[ \] **Create Backend:** Build the /api/ai/chat route using the native OpenAI library.  
5. \[ \] **Wire Up Settings:** Connect the ApiKeyDialog to the Transport initialization.

## **5\. Reference & Documentation (Source of Truth)**

**Attention AI Agent:** Use these exact documentation sources to implement the custom transport and menu items.

### **BlockNote Official Examples (The Blueprint)**

* Client-Side Transport Logic:  
  https://www.blocknotejs.org/examples/ai/client-side-transport  
  (Use this to understand how to write the sendMessages function).  
* Custom Menu Items:  
  https://www.blocknotejs.org/examples/ai/custom-ai-menu-items  
  (Use this to understand how to inject "Fix Grammar" and "Translate" buttons).  
* Minimal Setup:  
  https://www.blocknotejs.org/examples/ai/minimal  
* Playground Reference:  
  https://www.blocknotejs.org/examples/ai/playground  
* GitHub Source Code:  
  https://github.com/TypeCellOS/BlockNote/tree/main/examples/09-ai/06-client-side-transport

### **API (Provider)**

* **Base URL:** https://api.deepseek.com  
* Base URL: https://api.openai.com  
* **Compatibility:** Fully compatible with openai Node.js library.

### **OpenAI Node.js Library**

* **Docs:** https://github.com/openai/openai-node  
* **Streaming:** Look for stream: true in chat.completions.create.