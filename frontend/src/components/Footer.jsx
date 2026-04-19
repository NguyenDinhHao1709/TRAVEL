import React from 'react';

function Footer() {
  return (
    <footer style={{background:'#003366',color:'#fff',padding:'1rem',marginTop:'2rem',textAlign:'center'}}>
      &copy; {new Date().getFullYear()} Travel Management System
    </footer>
  );
}

export default Footer;
