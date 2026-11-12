import React from "react";
import AppHeader from "../AppHeader";

export default function Shell({ children }) {

  return (

    <>

      <AppHeader />

      {children}

    </>

  );

}
