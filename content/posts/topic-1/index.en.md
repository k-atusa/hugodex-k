---
title: "Distributed Consensus and Raft Architecture"
date: 2026-11-17T14:30:00+09:00
draft: false
category: "Distributed Systems"
tags: ["DistributedSystems", "Consensus", "Raft"]
math: true
mermaid: true
---

Maintaining a consistent replicated state across multiple machines despite network partitions, packet drops, and node failures is one of the foundational challenges in distributed systems.

---

## 1. Architecture Topology and Image

Below is an illustration of the distributed cluster topology and post attachment:

![Distributed Cluster Topology](image.jpg)

---

## 2. Node State Transition Model

Raft simplifies consensus by decomposing node roles into three distinct states:
1. **Leader**: Handles all client requests and manages log replication
2. **Follower**: Passively responds to heartbeats and log entries
3. **Candidate**: Initiates election votes when heartbeat timeouts occur

```mermaid
stateDiagram-v2
    [*] --> Follower: Node start
    Follower --> Candidate: Election timeout (no heartbeat)
    Candidate --> Candidate: Split vote (restart timer)
    Candidate --> Leader: Receives votes from majority
    Candidate --> Follower: Discovers leader with higher term
    Leader --> Follower: Discovers higher term in message
```

---

## 3. Quorum Formulation

For a cluster of $N$ nodes, the minimum quorum $Q$ required to guarantee progress despite $f$ failures is:

$$
Q = \left\lfloor \frac{N}{2} \right\rfloor + 1, \quad N \ge 2f + 1
$$

{{< callout type="theorem" title="Leader Completeness" >}}
If a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms:
$$
\text{committed}(e, \tau) \implies \forall \tau' > \tau, \ e \in \text{log}(\text{leader}_{\tau'})
$$
{{< /callout >}}

---

## 4. Replication Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant L as Leader (Node 1)
    participant F1 as Follower (Node 2)
    participant F2 as Follower (Node 3)

    C->>L: Write command: set x=100
    L->>L: Append uncommitted local log
    par Parallel AppendEntries RPCs
        L->>F1: AppendEntries RPC
        L->>F2: AppendEntries RPC
    end
    F1-->>L: Success
    F2-->>L: Success
    Note over L: Majority (3/3) confirmed -> Entry committed
    L-->>C: Write acknowledged (200 OK)
```
