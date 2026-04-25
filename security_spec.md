# Security Specification for Lumina Learn

## Data Invariants
1. A **Quiz** can only be created by an authenticated user.
2. **Questions** are immutable once created and must belong to a valid Quiz owned by the requester.
3. **Attempts** can only be read and created by the user who took them.
4. Users cannot modify their own roles or `uid` once set.
5. All IDs must match `^[a-zA-Z0-9_\\-]+$`.

## The Dirty Dozen Payloads (Rejection Targets)

1. **Identity Spoofing**: Attempt to create a quiz with `ownerId` of another user.
2. **Path Poisoning**: Attempt to access a quiz with a 2KB long string as ID.
3. **Shadow Update**: Attempt to add `isVerified: true` to a user profile update.
4. **Relational Break**: Attempt to add a question to a quiz that doesn't exist.
5. **Orphan Write**: Create an attempt for a quiz the user hasn't accessed.
6. **Bypassing Ownership**: Attempt to list all quizzes without a `where("ownerId", "==", uid)` filter.
7. **Type Poisoning**: Sending `score: "High"` instead of a number in an attempt.
8. **Size Attack**: Sending a 1MB string in the `title` field.
9. **Terminal State Bypass**: Attempting to update a quiz status from `ready` back to `processing`.
10. **PII Leak**: Attempting to read another user's email via `get(/users/attacker)`.
11. **Timestamp Spoofing**: Sending a manual `createdAt` string instead of `request.time`.
12. **Cross-User Attempt**: reading an attempt belonging to another `userId`.

## Test Runner (firestore.rules.test.ts)
(To be implemented after rules draft)
