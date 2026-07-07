# Zeta-26 Interplanetary Routing Simulator

Zeta-26 is a real-time web application that simulates a futuristic interplanetary communication network using the "Relic Ring Protocol". It demonstrates advanced routing algorithms, physics-based latency calculations, and network resilience.

## Overview

The simulator consists of a FastAPI backend and a React frontend. The network contains multiple planetary nodes (e.g., Aegis, Boreas, Dawn), each equipped with communication towers and differing atmospheric/physical properties.

### Features
*   **Physics-Based Routing:** Calculates void travel distances and internal fiber transit times taking into account atmospheric refraction, planet radii, and the speed of light.
*   **Dynamic Shortest-Path Algorithm:** Uses Dijkstra's algorithm to determine the most efficient route between origin and destination planets.
*   **Chaos Mode:** Allows users to simulate network failures by "killing" nodes or links, prompting the system to re-route traffic dynamically.
*   **End-to-End Encryption (E2EE):** Simulates security by applying an XOR stream cipher (using SHA-256) over the network payload.
*   **Codex Translations:** Demonstrates data transformations as messages pass through planetary nodes with different base-encoding systems (Codex).

## Project Structure

*   `backend/`: Contains the FastAPI application.
    *   `main.py`: API entry point and HTTP endpoints.
    *   `universe.py`: Handles state loading and tower initializations from `universe-config.json`.
    *   `router.py`: Dijkstra routing algorithm implementation.
    *   `physics.py`: Mathematical calculations for distance and latency.
    *   `packet.py`: Constructs the network payload, E2EE, and simulation hop logs.
    *   `chaos.py`: State management for network disruptions.
    *   `codex.py`: Handles string-to-base encoding.
*   `frontend/`: Contains the React application built with Vite.
    *   `src/App.jsx`: Main application container, manages global state and coordinates UI components.
    *   `src/components/`: Reusable UI elements for rendering the Star Map, Hop Logs, and Analytics.

## Getting Started

### Using Docker Compose (Recommended)
You can run both the frontend and backend simultaneously using Docker Compose:
```bash
docker-compose up --build
```
This will start the backend API on port 8000 and the frontend on port 80 (or as configured in docker-compose.yml).

### Running Locally
If you prefer not to use Docker, you can run them manually:
1.  **Backend:** Navigate to `backend/` and run `uvicorn main:app --reload` to start the FastAPI server.
2.  **Frontend:** Navigate to `frontend/`, run `npm install` followed by `npm run dev` to launch the React interface.

## Configuration

The universe's properties, nodes, and physics constraints are defined in `universe-config.json` at the root of the project. Modifying this file will automatically alter the simulation conditions on the next backend startup.