# ClaimAssist – Customer claim submission

Customer-facing web app: verify policy → incident details → upload documents → submit, then track the claim.
Submitting inserts a new row into Supabase `uw_claims` (status `New`) plus `uw_claim_documents` rows and files in the `claim-uploads` bucket,
so it appears instantly in the ClaimAssist underwriter portal. Demo policy: `POL-45876`, mobile last 4 digits `0337`.
