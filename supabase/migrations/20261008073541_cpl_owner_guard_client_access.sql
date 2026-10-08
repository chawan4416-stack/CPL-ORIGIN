-- Make the private administrative configuration explicitly deny app clients,
-- and remove the unnecessary anonymous boolean helper endpoint.
CREATE POLICY deny_client_access ON cpl_private.app_owner AS RESTRICTIVE FOR ALL
 TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE EXECUTE ON FUNCTION public.cpl_is_owner() FROM anon;
