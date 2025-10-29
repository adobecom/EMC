/* 
* <license header>
*/

import React from 'react'
import { NavLink } from 'react-router-dom'

const SideBar: React.FC = () => {
  return (
    <ul className="SideNav">
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          end
          to="/"
        >
          Home
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/profile"
        >
          User Profile
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/organizations"
        >
          Organizations & Teams
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/resources"
        >
          Resources Dashboard
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/registrations"
        >
          Event Registrations
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/actions"
        >
          Your App Actions
        </NavLink>
      </li>
      <li className="SideNav-item">
        <NavLink
          className={({ isActive }) => `SideNav-itemLink ${isActive ? 'is-selected' : ''}`}
          aria-current="page"
          to="/about"
        >
          About App Builder
        </NavLink>
      </li>
    </ul>
  )
}

export default SideBar

