# Troubleshooting Guide: Work Orders & State Machine Errors

This guide addresses problems encountered when executing maintenance work orders, navigating the lifecycle state machine, logging technician resources, and resolving supervisory closeout restrictions.

```carousel
![Work Orders Kanban Board](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-002-work-orders-kanban-annotated.png)
<!-- slide -->
![Work Order Detail Modal](file:///e:/My%20Owns/docs/user-manual/screenshots/annotated/WO-004-work-order-detail-modal-annotated.png)
```

---

## Issue 4.1: Disallowed State Transition (`InvalidWorkOrderStatusTransitionError`)

**Problem:** In the `WorkOrderDetailModal` (`WO-004`) or Kanban Board, attempting to transition a ticket displays HTTP 400 Bad Request:
> *"Error INVALID_STATUS_TRANSITION: Cannot transition work order from 'draft' directly to 'completed'. Allowed next states: ['open', 'cancelled']."*

**Possible Cause:**
1. Attempting to bypass mandatory engineering lifecycle stages (e.g. attempting to jump from `draft` directly to `in_progress` or `completed`).
2. LuminaFM enforces a strict finite state machine to guarantee regulatory compliance and quality assurance.

**How to Resolve:**
1. Follow the sequential state machine path:
   $$\text{draft} \longrightarrow \text{open} \longrightarrow \text{approved} \longrightarrow \text{assigned} \longrightarrow \text{in\_progress} \longrightarrow \text{completed} \longrightarrow \text{closed}$$
2. In the `WorkOrderDetailModal`, check the **Allowed State Transitions** box.
3. Only click dynamic buttons rendered under the allowed list:
   - From `draft`: Click **Transition to OPEN**.
   - From `open`: Click **Transition to APPROVED** or **Transition to ASSIGNED**.
   - From `assigned`: Click **Transition to IN_PROGRESS**.
   - From `in_progress`: Click **Transition to COMPLETED**.
   - From `completed`: Click **Transition to CLOSED** (Requires Supervisor).

**Prevention:** Review the [State Machine Matrix in Workflow 06](file:///e:/My%20Owns/docs/user-manual/05-workflows/06-work-order-lifecycle.md) before managing ticket lifecycles.

**Escalation:** If a ticket was created erroneously, transition it to `cancelled` with an explanation.

---

## Issue 4.2: Missing Mandatory State Transition Justification Reason

**Problem:** In the `WorkOrderStatusTransitionModal`, clicking **Confirm State Transition** returns a validation error:
> *"Transition justification notes are required for regulatory audit trail."*

**Possible Cause:**
1. The **Transition Notes / Justification Reason** input field was left blank or contains fewer than 5 characters.
2. In accordance with ASME and facility CMMS standards, every status change must record an auditable technical explanation.

**How to Resolve:**
1. In the reason text field, type a concise explanation of why the state is changing:
   - For `assigned` $\rightarrow$ `in_progress`: `"Arrived on site; completed LOTO isolation on breaker MCC-01."`
   - For `in_progress` $\rightarrow$ `completed`: `"Replaced mechanical seal cartridge; leak test nominal at 10.5 bar."`
   - For `in_progress` $\rightarrow$ `on_hold`: `"Awaiting delivery of replacement spiral wound gaskets from warehouse."`
2. Click **Confirm State Transition**.

**Prevention:** Always formulate a one-sentence mechanical summary of work performed or delay reasons before clicking transition triggers.

**Escalation:** None; entering a valid justification resolves the block.

---

## Issue 4.3: Technician Blocked from Closing a Completed Ticket

**Problem:** A maintenance technician completes all tasks on a work order, transitions it to `completed`, but the **Transition to CLOSED** button is missing, or clicking it returns HTTP 403 Forbidden:
> *"Forbidden: Final ticket closure requires supervisory engineering authority."*

**Possible Cause:**
1. The active user persona is `Maintenance Technician`.
2. Under LuminaFM segregation-of-duties rules, technicians who execute work cannot perform the final quality and financial signoff on their own tickets. Only a `Plant Reliability Engineer` or `Organization Admin` can close tickets.

**How to Resolve:**
1. As a technician, your job on the ticket is finished once it reaches `completed` status.
2. Notify your Lead Reliability Engineer or Supervisor that the ticket is ready for final signoff.
3. The supervisor logs in as `Plant Reliability Engineer`, inspects task completion and cost rollups in `WorkOrderDetailModal`, and clicks **Transition to CLOSED**.

**Prevention:** Understand the role boundaries between work execution (Technician) and quality closeout (Engineer/Admin).

**Escalation:** Contact your `Plant Reliability Engineer` if a completed ticket remains unclosed for more than 48 hours.

---

## Issue 4.4: Negative or Zero Labor Hours Error

**Problem:** When adding technician labor in the `WorkOrderDetailModal`, clicking **Add Labor Entry** returns:
> *"Labor hours worked must be a positive number greater than 0.1 hours."*

**Possible Cause:**
1. Entering `0`, negative numbers, or non-numerical characters in the hours input.

**How to Resolve:**
1. Enter the actual elapsed labor duration as a positive float (e.g. `1.5`, `3.0`, `6.5`).
2. Verify technician hourly rate is positive.
3. Click **Add Labor Entry**.

**Prevention:** Record labor immediately upon completing physical maintenance tasks.

**Escalation:** Contact the administrator if technician billing rates in the system are incorrect.
