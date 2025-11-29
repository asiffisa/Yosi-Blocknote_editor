# **Project Yosi: Technical Master Plan & PRD**

Version: 2.0 (BlockNote Edition)  
App Name: Yosi (Tamil: "Think")  
Vision: An AI-powered cognitive workspace that serves as both a "Zen" writing environment and a ubiquitous browser companion. It shifts focus from mechanical typing to intelligent thinking.

## **1\. Core Architecture: "The Trinity Monorepo"**

We will use a **Monorepo** structure managed by pnpm workspaces. This allows code sharing between the Web App and the Chrome Extension.

### **The Three Surfaces**

1. **Apps/Web (The Canvas):** A Next.js 14 dashboard for deep work, drafting, and settings.  
2. **Apps/Extension (The Injector):** A Plasmo-based Chrome Extension that injects the Yosi Sidebar and Ghost Overlay into third-party sites.  
3. **Packages/UI (The Shared Brain):** A shared library containing Shadcn components, the BlockNote configuration, and the Vercel AI SDK logic.

## **2\. Phased Implementation Roadmap**

### **Phase 1: The Canvas (Web Dashboard)**

* **Objective:** Build the "Zen Mode" editor using BlockNote.  
* **Key Features:**  
  * **Layout:** Use react-resizable-panels to create a 2-pane layout:  
    a) Canvas: \[ bacground fill image  \+ blocknote i frame one top\] or webpage   
    b) Side bar: using react-resizable-panels on right side, with the help of plasmo  
  * **Editor:** Integrate **BlockNote**.  
    * Enable default "Slash" (/) commands.  
    * Enable drag-and-drop blocks.  
    * **Theming:** Override BlockNote CSS variables to match Shadcn UI (Inter font, Slate-900 text).  
  * **Web Preview:** An iframe component to render user-pasted URLs for reference.

### **Phase 2: The Companion (Sidebar Architecture)**

* **Objective:** Create a unified Sidebar that works everywhere.  
* **Key Features:**  
  * **Shared Component:** Develop the Sidebar in packages/ui so it is identical on Web and Extension.  
  * **Plasmo Side Panel:** Implement chrome.sidePanel API to allow the sidebar to open alongside browser tabs without obscuring content.  
  * **State Machine:**  
    * *Main panel: Chat* interface (Default AI conversation).  
    * *View:* Tools (Proofread, Brainstorm, Rewrite, grammar check).  
    * *View: Settings* (API Keys, Profile,logout, delete account).

### **Phase 3: The Brain (AI Integration)**

* **Objective:** Connect the frontend to LLMs via Vercel AI SDK.  
* **Key Features:**  
  * **Universal Switchboard:** A single API route that routes requests based on user preference.  
    * *Tier 1 (Fast/Cheap):* **DeepSeek-V3** or **Gemini Flash**.  
    * *Tier 2 (Pro/Smart):* **GPT-4o** or **Claude 3.5 Sonnet**.  
  * **Context Awareness:** The AI must be able to read the current "Active Block" in BlockNote or the selected text in the browser.  
  * **Persona System:** Allow users to switch System Prompts (e.g., "Professional Editor" vs. "Creative Writer").

### **Phase 4: The "Ghost" Overlay (Advanced Interaction)**

* **Objective:** Highlight errors inside third-party input fields (Gmail, Twitter).  
* **Technical Strategy:**  
  * **Overlay Logic:** Create a transparent div positioned exactly *behind* the active HTML input element.  
  * **Mirroring:** Copy font-size, line-height, and padding from the target input to the ghost div.  
  * **Rendering:** Render red wavy underlines in the ghost div.  
  * **Interaction:**  
    * Inject a floating **Yosi Icon** (using floating-ui) at the bottom-right of the active input.  
    * On Hover: Show a "Quick Fix" popover using Shadcn.

### **Phase 5: The System (Persistence & Auth)**

* **Objective:** User management and data sync.  
* **Key Features:**  
  * **Auth:** Supabase Auth (Google & Email).  
  * **Storage:**  
    * *Web:* Supabase Postgres (Remote).  
    * *Extension:* chrome.storage.local (Local Sync).  
  * **Sync Logic:** When the extension opens, check Supabase for the latest "Custom Personas" and cache them locally.

## **3\. The Tech Stack**

| Category | Technology | Reasoning |
| :---- | :---- | :---- |
| **Monorepo** | **pnpm** workspaces | Fast, efficient dependency management for shared packages. |
| **Web Framework** | **Next.js 16.05 **(App Router) | React Server Components for performance. |
| **Extension** | **Plasmo** | The "Next.js for Extensions" \- handles HMR and builds. |
| **Editor** | **BlockNote** | **Critical Choice.** Instant Notion-like blocks without complex config. |
| **UI Library** | **Shadcn/ui** \+ **Tailwind** | Copy-paste accessible components; fully customizable. |
| **AI SDK** | **Vercel** AI SDK | Unified API for OpenAI, DeepSeek, and Gemini. |
| **Database** | **Supabase** | Managed Postgres \+ Auth \+ Vector (future proof). |
| **Positioning** | **floating-ui** | Essential for the "Ghost" icon positioning. |

## **4\. Directory Structure (Monorepo)**

/yosi-monorepo  
├── /apps  
│   ├── /web                  \<-- Next.js Dashboard  
│   │   ├── /app              \<-- App Router Pages  
│   │   └── /components       \<-- Web-specific wrappers  
│   │  
│   └── /extension            \<-- Plasmo Extension  
│       ├── /popup.tsx        \<-- Toolbar Icon Menu  
│       ├── /sidepanel.tsx    \<-- Main Sidebar (Imports from Shared UI)  
│       └── /contents         \<-- Content Scripts  
│           └── ghost-overlay.tsx \<-- The Input Highlighter Logic  
│  
├── /packages  
│   └── /ui                   \<-- SHARED LIBRARY  
│       ├── /components  
│       │   ├── /editor       \<-- BlockNote Editor Configuration  
│       │   ├── /sidebar      \<-- The Main Sidebar Component  
│       │   └── /ui           \<-- Shadcn Primitives (Button, Card)  
│       ├── /lib              \<-- Utils (cn, AI helpers)  
│       └── package.json  
│  
├── pnpm-workspace.yaml  
└── package.json

## **5\. Implementation Rules for AI (Cursor/Antigravity)**

* **Styling:** Always use clsx and tailwind-merge for class names. Use Shadcn components for all interactive elements.  
* **Editor:** Do NOT use raw Tiptap. Use @blocknote/react. Customize via CSS variables (.bn-container) rather than deep React overrides unless necessary.  
* **State:** Use useStorage (from Plasmo) for extension state and standard React useState for UI transient state. Avoid Redux/Zustand for now.  
* **AI:** Abstract all LLM calls into a generic generateText function in packages/ui/lib/ai.ts so we can swap providers globally.

## **🛠️ LLM Context Bank (Developer Documentation)**

**Attention AI Agent:** Use the following documentation sources to implement features correctly.

* **Next.js**  
  https://nextjs.org/docs  

* **Lucide React (Icons):**
Docs: https://lucide.dev/guide/packages/lucide-react
Gallery: https://lucide.dev/icons

* **BlockNote (Editor):**  
  * *Docs:* https://www.blocknotejs.org/docs/  
  * https://www.blocknotejs.org/docs/features/ai  
  * https://www.npmjs.com/package/@blocknote/core  
  * *Theming:* Look for "Theming & Styling" to override CSS variables for Shadcn compatibility.  
  * *React Integration:* Use @blocknote/react and useCreateBlockNote.  
* **Plasmo (Extension Framework):**  
  * *Docs:* https://docs.plasmo.com/  
  * *Side Panel:* Use CSUI (Content Script UI) for the Ghost Overlay and Sidepanel for the Sidebar.  
  * *Storage:* Use @plasmohq/storage for persisting user settings.  
* **Vercel AI SDK:**  
  * *Docs:* https://sdk.vercel.ai/docs  
  * *Core:* Use streamText for chat responses.  
  * *Providers:* Use @ai-sdk/openai and @ai-sdk/google.  
* **Shadcn UI:**  
  * *Docs:* https://ui.shadcn.com/docs  
  * *Implementation:* Components are located in packages/ui/components/ui.  
* **Supabase:**  
  * https://supabase.com/docs