# TODO - Staff Flip Card Relocation + Admin Stability

- [x] Revert `src/pages/dashboard/Staff.jsx` to admin CRUD UI only
  - [x] Remove `StaffFlipCard` import
  - [x] Remove flip-card rendering/grid section
  - [x] Ensure staff selection/details + filter + modals still work
- [x] Relocate flip cards to `src/pages/public/Team.jsx`
  - [x] Remove hardcoded `teamMembers`
  - [x] Import `StaffFlipCard` and `assets/css/staff.css`
  - [x] Map `staff` from `ClinicContext` into responsive grid
  - [x] Ensure CTA uses `button type="button"` (via existing `StaffFlipCard`
- [x] Stabilize CSS
  - [x] Verify `assets/css/staff.css` is still required (Team page)
  - [x] Do not delete flip-card CSS from `staff.css` if still used by `StaffFlipCard`
- [x] Verify via dev server/build
  - [x] Build succeeds
  - [ ] Team page: cards render from context; flip works locally
  - [ ] Admin Staff page: filter/add/remove/day-off works
  - [ ] No flipping occurs in Admin Staff page


