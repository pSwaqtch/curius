# Curius API Documentation

Base URL: `https://curius.app/api`

## Authentication

Most read endpoints are public. Authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token via the signup or login endpoints.

---

## Auth

### POST /signup
Sign up with Google OAuth.
- **Body:** `{ googleResponse: { token }, groupSlug? }`
- **Response:** `{ jwt, user }`

### POST /signup/email
Sign up with email/password.
- **Body:** `{ firstName, lastName, email, password, groupSlug? }`
- **Response:** `{ jwt, user }`

### POST /login
Log in with Google OAuth.
- **Body:** `{ googleResponse: { token } }`
- **Response:** `{ jwt, user }`

### POST /login/email
Log in with email/password.
- **Body:** `{ email, password }`
- **Response:** `{ jwt, user }`

### POST /reset-password
Reset a user's password.
- **Body:** `{ token, password }`
- **Response:** `{ message }`

### GET /reset-password/verify
Verify a password reset token.
- **Query:** `?token=<reset_token>`
- **Response:** `{ userLink }`

---

## Users

### GET /user
Get the authenticated user's profile. **Auth required.**
- **Response:** `{ user }` — FullUser with `followingUsers` array

### GET /users/:userLink
Get a user's public profile by their userLink (username).
- **Param:** `:userLink` — the user's username slug
- **Response:** `{ user }` — FullUser with `followingUsers` array

### GET /users/all
Get all users.
- **Response:** `{ users }` — array of User objects

### PUT /user/profile
Update the authenticated user's profile. **Auth required.**
- **Body:** `{ firstName?, lastName?, userLink? }` — at least one field required. `userLink` must be alphanumeric with hyphens only.
- **Response:** `{ success, user }`

### PUT /user/websites
Update the authenticated user's linked websites. **Auth required.**
- **Body:** `{ twitter, website }`
- **Response:** `{ success }`

---

## Social / Following

### GET /user/followers
Get users who follow the authenticated user. **Auth required.**
- **Response:** `{ followers }` — array of User objects

### GET /user/following
Get users the authenticated user follows. **Auth required.**
- **Response:** `{ following }` — array of User objects

### POST /user/following
Follow a user. **Auth required.**
- **Body:** `{ toUid }` — user ID to follow (number)
- **Response:** `{ success }`

### DELETE /user/following/:toUid
Unfollow a user. **Auth required.**
- **Param:** `:toUid` — user ID to unfollow
- **Response:** `{ success }`

### GET /users/:uid/followingLinks
Get the most recent link from each person a user follows, sorted by most recently saved.
- **Param:** `:uid` — user ID
- **Response:** `{ users }` — array of `{ user: User, link: Link }`

### GET /users/:uid/followingReads
Get the most recent read from each person a user follows.
- **Param:** `:uid` — user ID
- **Response:** `{ users }` — array of `{ user: User, link: Link }`

### GET /users/:uid/followingHighlights
Get the most recent highlight from each person a user follows.
- **Param:** `:uid` — user ID
- **Response:** `{ users }` — array of `{ highlight: Highlight, user: User, link: Link }`

### GET /users/:uid/suggestedFollows
Get suggested users to follow, ranked by mutual connections and recency.
- **Param:** `:uid` — user ID
- **Response:** `{ users }` — array of `{ user: User, link: Link, score }`

### GET /recommendedUsers
Get recommended users for the authenticated user (within 2 degrees, active in last 30 days). **Auth required.**
- **Response:** `{ recommendedUsers }` — array of FullUser objects

---

## Links (Bookmarks)

### GET /users/:uid/links
Get a user's bookmarks (bookshelf view).
- **Param:** `:uid` — user ID
- **Query:** `?page=0&query=&favorited=0&toRead=0&topicSlug=&trailHash=&includeFollowing=`
- **Response:** `{ userSaved }` — array of Link objects

### GET /links
Get links with filtering. Same as above, used for trail and topic views.
- **Query:** `?page=0&query=&favorited=0&toRead=0&topicSlug=&trailHash=`
- **Response:** `{ userSaved }` — array of Link objects

### GET /links/all
Get all links across the network, paginated.
- **Query:** `?page=0&topicSlug=`
- **Response:** `{ library }` — array of links with `users`, `comments`, `highlights`

### GET /linkview/:id
Get a single link's detail view. Includes network interactions if authenticated.
- **Param:** `:id` — link ID
- **Response:** `{ link }` — LinkView with network users, comments, highlights. If authenticated and user has saved the link: `{ link, fullLink }`.

### GET /links/:id/user/:userLink
Get a specific link saved by a specific user.
- **Param:** `:id` — link ID, `:userLink` — user's username slug
- **Response:** `{ link }` — FullLink object

### POST /links
Save a new link. **Auth required.**
- **Body:** `{ link: { title, link, snippet }, highlight?: { highlightText, leftContext, rightContext, rawHighlight } }`
- **Response:** `{ link }` — FullLink object

### POST /links/:id
Save an existing link to the user's bookshelf. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ toRead }` — boolean, whether to add to reading queue
- **Response:** `{ success }`

### GET /links/:id
Get a link by ID. **Auth required.**
- **Param:** `:id` — link ID
- **Response:** `{ link }` — FullLink object

### DELETE /links/:id
Delete a link from the user's bookshelf. **Auth required.**
- **Param:** `:id` — link ID
- **Response:** `{ success }`

### POST /links/:id/title
Rename a link. **Auth required.** Only the original creator or admins can rename.
- **Param:** `:id` — link ID
- **Body:** `{ title }` — new title string
- **Response:** `{ link }` — updated FullLink

### POST /links/:id/favorite
Set favorite status on a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ favorite }` — boolean (true or false)
- **Response:** `{ success }`

### POST /links/:id/rating
Rate a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ rating }` — integer 0–5
- **Response:** `{ success }`

### POST /links/:id/classify
Auto-classify a link's topic using ML. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ doc }` — document text to classify
- **Response:** `{ link, suggestions }` — FullLink and array of up to 3 suggested topic strings

### GET /links/:id/related
Get related links.
- **Param:** `:id` — link ID
- **Response:** `{ links }` — array of Link objects

### POST /links/url
Look up a link by its URL (canonicalized). **Auth required.**
- **Body:** `{ url }` — the URL string
- **Response:** `{ link }` — FullLink if found, or `{}` if not

### POST /links/url/network
Look up a link by URL and return all network interactions. **Auth required.**
- **Body:** `{ url }` — the URL string
- **Response:** `{ networkInfo }` — link with `users`, `highlights`, `trail`, and metadata. Or `{}` if not found.

### GET /favorites
Get the authenticated user's network's favorite links. **Auth required.**
- **Response:** `{ favorites }` — array of links with `users`, `comments`, `highlights`

---

## Highlights

### GET /links/:id/highlights
Get highlights for a link. **Auth required.**
- **Param:** `:id` — link ID
- **Response:** `{ highlights }` — array of FullHighlight objects (with comment, mentions, user)

### POST /links/:id/highlights
Add a highlight to a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ highlight: { highlightText, leftContext, rightContext, rawHighlight, position } }`
- **Response:** `{ success }`

### DELETE /links/:id/highlights
Delete a highlight from a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ highlightText }` — the exact highlight text to remove
- **Response:** `{ success }`

### GET /snippets
Get recent highlights across the network.
- **Query:** `?page=0&topicSlug=&uid=`
- **Response:** `{ highlights }` — array of highlights with `user` and `link` attached

### PUT /highlight/:id/verify
Verify a highlight (admin only). **Auth required.**
- **Param:** `:id` — highlight ID
- **Body:** `{ verify }` — boolean
- **Response:** `{ success }`

### POST /links/randomHighlight
Get a random highlight from a user.
- **Body:** `{ uid }` — user ID
- **Response:** `{ highlightId, link }` — or `{}` if user has too few highlights

---

## Comments & Mentions

### POST /links/:id/comment
Add a comment on a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ commentText }` — comment string
- **Query:** `?trailHash=` (optional, to scope comment to a trail)
- **Response:** `{ success }`

### PUT /links/:id/comment
Upsert a comment on a link (create or update). **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ commentText }` — comment string
- **Response:** `{ success }`

### PUT /links/:id/highlight/comment
Upsert a comment on a highlight. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ commentText, highlightId }` — comment string and highlight ID
- **Response:** `{ success }`

### POST /comments
Reply to a comment. **Auth required.**
- **Body:** `{ commentId, replyText }` — parent comment ID and reply string
- **Response:** `{ success }`

### PUT /comments
Edit a comment. **Auth required.**
- **Body:** `{ commentId, commentText }` — comment ID and new text
- **Response:** `{ success }`

### DELETE /comments
Delete a comment. **Auth required.**
- **Body:** `{ commentId }` — comment ID to delete
- **Response:** `{ success }`

### POST /links/:id/mention
Mention a user on a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ toUid, comment, highlight, link }` — user ID to mention and context objects
- **Response:** `{ success }`

### PUT /links/:id/mention
Upsert mentions on a link (replace all mentions). **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ toUids, comment, highlight, link }` — array of user IDs and context objects
- **Response:** `{ success }`

---

## Topics

### GET /user/topics
Get topics for a user.
- **Query:** `?uid=` (optional, defaults to authenticated user)
- **Response:** `{ topics }` — array of Topic objects

### GET /topics
Get popular topic suggestions (topics with >3 saves, max 10).
- **Response:** `{ topics }` — array of Topic objects

### POST /user/topics
Create a new topic. **Auth required.**
- **Body:** `{ topic: { topic } }` — where `topic` is the topic name string
- **Response:** `{ topic }` — the created Topic object

### DELETE /user/topics
Delete a topic. **Auth required.**
- **Body:** `{ topic: { topic } }` — where `topic` is the topic name string
- **Response:** `{ success }`

### PUT /user/topic
Rename a topic. **Auth required.**
- **Body:** `{ topic: { id }, topicName }` — topic ID and new name string
- **Response:** `{ topic }` — the renamed Topic object

### GET /links/:id/topics
Get topics for a link. **Auth required.**
- **Param:** `:id` — link ID
- **Response:** `{ topics }` — array of Topic objects

### POST /links/:id/topics
Add a topic to a link. Creates the topic if it doesn't exist. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ topic: { topic } }` — where `topic` is the topic name string
- **Response:** `{ link }` — updated FullLink

### PUT /links/:id/topics
Upsert topics on a link (replace all topics). **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ topics }` — array of topic strings
- **Response:** `{ success }`

### DELETE /links/:id/topics
Remove a topic from a link. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ topic: { topic } }` — where `topic` is the topic name string
- **Response:** `{ link }` — updated FullLink

---

## Trails

### GET /trails/:uid
Get trails for a user.
- **Param:** `:uid` — user ID
- **Response:** `{ trails }` — array of Trail objects, each with a `users` array of members

### GET /trails/:userLink/links
Get trail links for a user by userLink.
- **Param:** `:userLink` — user's username slug
- **Response:** `{ trailLinks }` — array of `{ trail: Trail, links: Link[] }`

### GET /gettrail/:hash
Get a trail by its hash.
- **Param:** `:hash` — trail hash string
- **Response:** `{ trail }` — Trail object with `users` array of members

### POST /trails
Create a trail. **Auth required.**
- **Body:** `{ name, uids }` — trail name and optional array of member user IDs
- **Response:** `{ trail }` — the created Trail object

### PUT /trails/edit
Edit a trail. Must be a member. **Auth required.**
- **Body:** `{ hash, trailName?, description?, colorHex?, emojiUnicode?, flipped?, uids? }` — `hash` is required. Pass `uids` to add members, or other fields to edit metadata.
- **Response:** `{ trail }` — updated Trail with `users` array

### PUT /trails/delete
Delete a trail. Must be the owner. **Auth required.**
- **Body:** `{ hash }` — trail hash string
- **Response:** (empty)

### POST /links/:id/trails
Add a link to a trail. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ trailHash }` — trail hash string
- **Response:** `{ link }` — updated FullLink

### DELETE /links/:id/trails
Remove a link from a trail. **Auth required.**
- **Param:** `:id` — link ID
- **Body:** `{ trailHash }` — trail hash string
- **Response:** `{ link }` — updated FullLink

---

## Library & Groups

### GET /library
Get the public library feed. Supports optional auth for personalized results.
- **Query:** `?page=0&groupSlug=&explore=&user=`
- **Response:** `{ library }` — array of links, each with `users`, `comments`, `highlights`

### GET /library/:topic
Get links for a specific topic in the library.
- **Param:** `:topic` — topic slug
- **Response:** `{ library }` — array of links with `users`, `comments`, `highlights`

### GET /groups
Get groups. Returns all groups by default, or filter by user/slug.
- **Query:** `?uid=` (get groups for a user) or `?groupSlug=` (get a specific group)
- **Response:** `{ groups }` — array of Group objects. Or `{ group }` if queried by slug.

### POST /groups
Create a group. **Auth required.**
- **Body:** `{ name, uids }` — group name and array of member user IDs
- **Response:** `{ group }` — the created Group object

### GET /groupLinks
Get links from group members or your network.
- **Query:** `?user=&groupSlug=&overview=&randomHighlight=`
- **Response:** `{ users }` — array of `{ user: User, links: Link[] }`, optionally with `randomHighlight`

### PUT /user/group
Add a user to a group. **Auth required.**
- **Body:** `{ uid, groupId }` — user ID and group ID (numbers)
- **Response:** `{ success }`

### DELETE /user/group
Remove a user from a group. **Auth required.**
- **Body:** `{ uid, groupId }` — user ID and group ID (numbers)
- **Response:** `{ success }`

---

## Search

### GET /search
Search links across the network by text query or domain.
- **Query:** `?query=<search_text>` or `?domain=<domain_name>`
- **Response:** `{ links }` — array of links with `users`, `comments`, `highlights`

### GET /users/:uid/searchLinks
Get all of a user's links (up to 10,000) for client-side search.
- **Param:** `:uid` — user ID
- **Response:** `{ links }` — array of Link objects

### GET /passageSearch
Full-text passage search across all links using Typesense.
- **Query:** `?query=<search_text>`
- **Response:** `{ links }` — array of links with highlighted `title` and `snippet` matches, plus `users`

### GET /passageSearch/:uid
Passage-level semantic search scoped to a single user's links.
- **Param:** `:uid` — user ID
- **Query:** `?query=<search_text>`
- **Response:** `{ links }` — array of links with `snippets` (matching passages)

---

## Activity & Notifications

### GET /activity
Get the authenticated user's notification feed (saves, mentions, replies, new followers). **Auth required.**
- **Response:** `{ activity }` — array of activity items (up to 50), sorted by date. Each item has a `type`: save, mention, reply, or newfollower.

### PUT /user/notifications/update
Mark notifications as read (sets last-checked timestamp to now). **Auth required.**
- **Response:** `{ success }`

### GET /links/activity
Get global link activity — all users with their recent links.
- **Response:** array of `{ user: User, links: Link[] }`

---

## Stats (Admin)

### GET /stats
Get platform-wide stats. Admin only.
- **Response:** `{ stats }` — includes user counts, link counts, growth metrics, retention cohorts, top domains/topics/links/users.

---

## Wrapped (Year in Review)

### GET /wrapped2022Links/:uid
Get a user's top links for the 2022 wrapped feature.
- **Param:** `:uid` — user ID
- **Response:** wrapped link data

### GET /wrapped2022Friends/:uid
Get a user's friend activity for the 2022 wrapped feature.
- **Param:** `:uid` — user ID
- **Response:** wrapped friend data

---

## Health Check

### GET /health
Returns service status and timestamp.
- **Response:** `{ status: "ok", timestamp }` or `503` with `{ status: "error", message, timestamp }` if database is unreachable.

---

## Data Models

### User
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| firstName | string | First name |
| lastName | string | Last name |
| userLink | string | Username / URL slug |
| lastOnline | string | Last online timestamp |

### FullUser (extends User)
Additional fields: `major`, `interests`, `expertise`, `school`, `github`, `website`, `twitter`, `createdDate`, `modifiedDate`, `views`, `numFollowers`, `followed`, `followingMe`.

### Link
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| link | string | URL |
| title | string | Title |
| snippet | string | Description / excerpt |
| favorite | boolean | Favorited |
| rating | number | User rating (0–5) |
| toRead | boolean | In reading queue |
| createdBy | number | User ID of creator |
| createdDate | string | Created timestamp |
| metadata | object | Crawled metadata |
| readCount | number | Number of reads |

### FullLink (extends Link)
Additional fields: `topics` (Topic[]), `highlights` (Highlight[]), `comments` (Comment[]), `mentions` (Mention[]).

### Topic
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| userId | number | Owner user ID |
| topic | string | Topic name |
| slug | string | URL slug |
| public | boolean | Publicly visible |
| numSaved | number | Links saved to topic |

### Highlight
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| userId | number | Owner user ID |
| linkId | number | Associated link ID |
| highlight | string | Highlighted text |
| position | number | Position in document |
| leftContext | string | Text before highlight |
| rightContext | string | Text after highlight |

### FullHighlight (extends Highlight)
Additional fields: `comment` (string), `mentions` (Mention[]), `user` (User).

### Trail
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| trailName | string | Trail name |
| ownerId | number | Owner user ID |
| description | string | Description |
| hash | string | Unique hash |
| slug | string | URL slug |
| colorHex | string | Display color |
| emojiUnicode | string | Display emoji |

### Comment
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| userId | number | Author user ID |
| parentId | number | Parent comment ID (for replies) |
| text | string | Comment text |
| createdDate | string | Created timestamp |
| replies | Comment[] | Nested replies (optional) |

### Group
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique ID |
| name | string | Group name |
| slug | string | URL slug |

### Mention
| Field | Type | Description |
|-------|------|-------------|
| fromUid | number | Mentioning user ID |
| toUid | number | Mentioned user ID |
| linkId | number | Link ID |
| highlightId | number | Highlight ID (optional) |
| createdDate | string | Created timestamp |
