# CPL Ver1.0 Ready

CPL Ver1.0 is ready for the final real-device acceptance test.

This is a data-collection release. Research analysis is intentionally not included in Ver1.0.

## Current architecture

- Smartphone-first Web App
- GitHub Pages hosting
- Supabase Auth + Google login
- Supabase PostgreSQL
- `master_options` as the master-data source
- `save_race()` as the authoritative race-save path
- `delete_race()` for the user's own race deletion
- RLS enabled for user data protection

## Final gate

The remaining release gate is the real-device acceptance test of login, race input, save, overwrite, registered-data display, and deletion.

After the real-device test passes, Ver1.0 can be marked complete.
