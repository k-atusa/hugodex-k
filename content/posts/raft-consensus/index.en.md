---
title: "Distributed Consensus: Raft Architecture and State Diagrams"
date: 2026-11-01T14:30:00+09:00
draft: false
tags: ["Architecture", "Distributed Systems", "Raft", "Mermaid", "Consensus"]
categories: ["Architecture"]
math: false
mermaid: true
description: "Visualizing the Raft consensus algorithm: Leader election, log replication, and cluster safety using Mermaid diagrams and SVG."
---

## 1. Overview

In distributed environments where network partitioning and node crashes occur frequently, maintaining a replicated state machine across independent nodes is a classic challenge.

The **Raft Algorithm** addresses this by decomposing consensus into three understandable subproblems:
1. **Leader Election**
2. **Log Replication**
3. **Safety**

---

## 2. Server State Transitions

Every server in a Raft cluster operates in one of three states:

```mermaid
stateDiagram-v2
    [*] --> Follower: Server Boot
    Follower --> Candidate: Election Timeout Expired
    Candidate --> Candidate: Split Vote Timeout
    Candidate --> Leader: Receives Majority Votes
    Candidate --> Follower: Discovers Higher Term Leader
    Leader --> Follower: Discovers Higher Term RPC
```

---

## 3. Leader Election Sequence

```mermaid
sequenceDiagram
    autonumber
    participant F1 as Follower 1 (Candidate)
    participant F2 as Follower 2
    participant F3 as Follower 3

    Note over F1: Election Timeout!\nTerm increments to 2
    F1->>F2: RequestVote(term=2, candidateId=F1)
    F1->>F3: RequestVote(term=2, candidateId=F1)
    
    F2-->>F1: VoteGranted(term=2, true)
    F3-->>F1: VoteGranted(term=2, true)
    
    Note over F1: Majority Acquired!\nTransition to Leader
    
    F1->>F2: AppendEntries (Heartbeat)
    F1->>F3: AppendEntries (Heartbeat)
```

---

## 4. Summary

Raft provides robust consensus semantics with unparalleled clarity, powering modern systems such as etcd and CockroachDB. With built-in Mermaid and SVG support, architectural flows can be documented directly within Markdown.

