// src/lib/homePath.js
// Where each kind of user lands after logging in, and whenever they open the site while logged in.
// The adviser asked for everyone to start on the Hazard Map, the main highlight of the system.
// The dashboards are still one click away in each role's navigation.
// (Want admins to land on their dashboard instead? Change '/admin/map' below to '/admin'.)
export const HOME_PATH = {
  citizen: '/citizen/map',
  inspector: '/inspector/map',
  admin: '/admin/map',
}

export function homePathFor(role) {
  return HOME_PATH[role] ?? HOME_PATH.citizen
}