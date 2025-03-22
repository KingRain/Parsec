# Parsec: Bridging the Vast Distance Between Code and Clarity

## Overview

Understanding a codebase and its architecture becomes increasingly complex as projects scale. Developers and teams often struggle with visualizing dependencies, maintaining up-to-date documentation, and quickly grasping the structure of unfamiliar codebases. The lack of clear, real-time architectural insights can lead to inefficiencies, miscommunication, and increased technical debt.

**Parsec** is an intelligent, automated architecture visualization tool that simplifies the process of understanding, maintaining, and optimizing codebases. It analyzes project structures and generates **clear, real-time architecture diagrams**, helping developers, business analysts, and stakeholders quickly grasp the design of a software system.

## Key Features

### 1. Automated Codebase-to-Diagram Conversion
- Analyzes both **high-level architecture** (module interactions, dependencies) and **low-level details** (class structures, function calls).
- Provides a **hierarchical, structured representation** of any codebase.
- Works across **multiple programming languages**, ensuring flexibility for various teams.

### 2. AI-Powered Customization & Insights
- **AI-generated diagrams** from conceptual inputs, allowing users to turn rough ideas into structured visuals.
- **Real-time suggestions** to optimize workflows, improve project organization, and highlight potential structural inefficiencies.
- **Diagram-to-Code Workflow** – Users can start with a sketch and transform it into a structured codebase with appropriate folders and files.

### 3. Live, Auto-Updating Architecture Visuals
- **Every commit updates the diagrams**, ensuring documentation never becomes outdated.
- Continuous integration with GitHub repositories via OAuth for seamless project synchronization.
- Supports **manual editing** of diagrams for further customization.

### 4. Enhanced Code Navigation & Collaboration
- Users can **click on diagram components to jump directly to the corresponding code**.
- Helps teams **collaborate across technical and non-technical roles** by providing multiple visualization styles (formal, detailed, simplified).
- Enables **multi-user collaboration**, ensuring better communication across development teams.

### 5. Seamless Documentation & Multi-Format Export
- **Supports multiple export formats**: Markdown (for GitHub READMEs), SVG, PNG, PDF, and JPEG.
- Allows integration into documentation tools, internal reports, and presentations.
- **Customizable styles** so users can generate formal, simplified, or highly detailed diagrams based on audience needs.

### 6. Hand-Drawn & Conceptual Diagram Conversion
- Convert **hand-drawn diagrams from tools like Excalidraw and Draw.io into Mermaid.js graphs and code**, making it easier to transition from concept to execution.
- **Manual editing & conceptual idea creation** are fully supported, allowing users to refine AI-generated diagrams or start with a custom blueprint.
- **Idea-to-Code Workflow** – Users can begin with **rough sketches or conceptual flowcharts**, and Parsec will suggest **structured workflows, folder structures, and project setups** to accelerate development.

## Tech Stack & Tools

- **Framework**: Built with **Next.js**, enabling server-side rendering and API handling within a single environment.
- **Backend**: Implemented within **Next.js API routes**, handling code parsing, diagram generation, and AI-powered suggestions.
- **Diagram Generation**: Uses **Mermaid.js** to dynamically create architecture diagrams from parsed code.
- **AI Integration**: Utilizes **Google Gen AI, LangChain, LangSmith, and LangGraph** to process code, suggest workflows, and generate diagrams based on project structure.
- **Hand-Drawn to Code Conversion**: Uses **Google Gen AI SDK** for OCR and vectorization, transforming sketches into structured Mermaid.js graphs.
- **GitHub Integration**: Uses the **GitHub API** for repository access, enabling real-time updates based on commits and changes.
- **Exporting & Sharing**: Supports multiple formats including **Markdown, SVG, PNG, and PDF**, ensuring seamless integration into documentation and presentations.

## Installation & Usage

### Prerequisites
- Node.js (v18+ recommended)
- GitHub OAuth setup (for repository access)
- Google Gen AI SDK credentials (for AI-powered features)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/parsec.git
   cd parsec
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser to start using Parsec.

## Contribution

We welcome contributions from the community! If you’d like to improve Parsec, follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and ensure everything works correctly.
4. Submit a pull request with a detailed description of your changes.

## License

This project is licensed under the **MIT License**.

:)

---

### **Parsec: Measuring the Distance Between Code and Understanding, One Diagram at a Time.**

