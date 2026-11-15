# Industrial CMMS & Engineering Glossary

This glossary defines standard terminology used throughout LuminaFM, covering Computerized Maintenance Management Systems (CMMS), thermodynamics, boiler operations, and multi-criteria decision mathematics.

---

### A
- **Analytic Network Process (ANP)**: A mathematical decision-support framework generalizing the Analytic Hierarchy Process (AHP). Unlike AHP (which assumes strict hierarchical independence between criteria), ANP captures non-linear feedback loops, interdependencies, and inner-cluster dependencies across decision criteria and alternatives.
- **Approach Temperature**: The temperature difference between the refrigerant evaporating/condensing saturation temperature and the fluid exiting temperature in a heat exchanger. In chillers:
  $$\text{Approach}_{\text{Condenser}} = T_{\text{Refrigerant Condensing}} - T_{\text{Condenser Water Leaving}}$$
  An approach temperature exceeding $2.5^\circ\text{C}$ indicates tube scale accumulation or biofouling.
- **Asset Master Registry**: The authoritative central database cataloging all plant equipment, nameplate specifications, operating parameters, and maintenance histories.
- **ASME Section I**: Rules for Construction of Power Boilers, published by the American Society of Mechanical Engineers. Governs boilers operating at steam pressures exceeding $15\text{ psig}$ ($1.03\text{ bar}$).

---

### B
- **Blowdown (Continuous)**: A continuous drain of water from just below the boiler water surface to remove concentrated Total Dissolved Solids (TDS) and prevent foaming or priming.
- **Blowdown (Bottom Intermittent)**: An intermittent high-velocity purge from the lowest point of the boiler shell/mud drum to eject accumulated precipitated sludge, scale particles, and sediment.
- **Boiler Water Hardness**: The concentration of calcium and magnesium ions dissolved in boiler feedwater. Unsoftened water precipitates as insulating scale on fireside heating tubes, dramatically reducing heat transfer and causing tube overheating.

---

### C
- **Coefficient of Performance (COP)**: Dimensionless ratio of useful refrigeration cooling thermal output to electrical work input:
  $$\text{COP} = \frac{Q_{\text{Cooling}}}{W_{\text{Electric}}} = \frac{3.51685}{\text{kW/TR}}$$
- **Computerized Maintenance Management System (CMMS)**: A software suite that centralizes maintenance data, automates work orders, tracks spare parts inventory, and manages regulatory compliance.
- **Consistency Ratio ($CR$)**: In pairwise comparison matrices, Saaty's metric measuring judgment consistency. A $CR < 0.10$ ($10\%$) is mathematically required to confirm reliable criteria weighting.

---

### D
- **Directed Acyclic Graph (DAG)**: A finite directed graph with no directed cycles. In LuminaFM, DAGs represent asset hierarchies without circular parent-child dependency loops.
- **Dynamic Attributes (JSONB)**: Schema-driven, polymorphic equipment attributes stored in PostgreSQL binary JSON (`JSONB`), allowing flexible nameplate specifications without altering core database tables.

---

### F
- **Fire-Tube Steam Boiler**: A boiler design where high-temperature combustion gases pass inside submerged steel tubes, transferring heat to the surrounding reservoir of boiler water.
- **Flue Gas Exit Temperature**: The temperature of combustion gases exiting the boiler stack. A stack temperature $> 190.0^\circ\text{C}$ indicates soot fouling on tube banks, representing thermal efficiency loss.

---

### L
- **Lockout / Tagout (LOTO)**: A formal safety isolation procedure ensuring that dangerous machinery and high-pressure steam lines are properly shut off, de-energized, depressurized, and locked out before maintenance begins.

---

### M
- **Mean Time Between Failures (MTBF)**: The average operational runtime between equipment failure events, measuring equipment reliability.
- **Mean Time to Repair (MTTR)**: The average time required to troubleshoot, repair, test, and restore failed equipment to service.

---

### P
- **Progressive Web Application (PWA)**: A web application utilizing service workers, web manifests, and local IndexedDB storage to provide offline data persistence, touch-first ergonomics, and fast reload on mobile tablets.
- **Proactive Maintenance Ratio (PMR)**: The percentage of total maintenance labor and parts expenditure dedicated to scheduled preventive and predictive routines versus emergency reactive repairs:
  $$\text{PMR} = \left( \frac{\text{Cost}_{\text{Preventive}} + \text{Cost}_{\text{Predictive}}}{\text{Cost}_{\text{Total Maintenance}}} \right) \times 100\%$$
  The world-class reliability benchmark target is $\ge 80\%$.

---

### R
- **Row-Level Security (RLS)**: A PostgreSQL database security mechanism that restricts row visibility based on the executing user's tenant organization context (`tenant_id`), guaranteeing multi-tenant isolation.

---

### S
- **SHA-256 Checksum**: A 256-bit cryptographic hash calculated from file bytes. Any alteration of a single byte completely changes the hash, ensuring non-repudiation in the LuminaFM Evidence Vault.
- **Supermatrix**: The core computational structure of the Analytic Network Process (ANP). Comprises an Unweighted Supermatrix (local priority vectors), Weighted Supermatrix (column-stochastic matrix), and Limit Supermatrix (converged steady-state priority weights).

---

### T
- **Ton of Refrigeration (TR)**: Unit of refrigeration power equivalent to the heat extraction required to freeze one short ton ($2,000\text{ lbs}$) of water at $0^\circ\text{C}$ in $24\text{ hours}$.
  $$1\text{ TR} = 3.51685\text{ kW}_{\text{thermal}} = 12,000\text{ BTU/hr}$$
- **Total Dissolved Solids (TDS)**: Measure of the combined content of all inorganic and organic substances contained in water in molecular, ionized, or micro-granular suspended form. Expressed in parts per million ($\text{ppm}$).
