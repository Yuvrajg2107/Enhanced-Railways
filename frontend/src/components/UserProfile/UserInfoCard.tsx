
import { useState, useEffect } from "react";
import axios from 'axios'
export default function UserInfoCard() {
  const [personalInformation, setPersonalInformation] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })


  useEffect(() => {
    axios.get("https://enhanced-railways.onrender.com/api/get-user-and-role", {
      withCredentials: true
    })
      .then(response => {
        console.log(response)
        setPersonalInformation({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
        })
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
      });
  }, []);

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                First Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {personalInformation.firstName ? personalInformation.firstName.charAt(0).toUpperCase() + personalInformation.firstName.slice(1).toLowerCase() : "Loading..."}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {personalInformation.lastName ? personalInformation.lastName.charAt(0).toUpperCase() + personalInformation.lastName.slice(1).toLowerCase() : "Loading..."}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {personalInformation.email ? personalInformation.email : "Loading..."}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
