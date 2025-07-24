import { Link } from "react-router-dom";
import { useState } from "react";

import XSvg from "../../../components/svgs/X";

import { MdOutlineMail } from "react-icons/md";
import { FaUser } from "react-icons/fa";
import { MdPassword } from "react-icons/md";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { FaEye, FaEyeSlash } from "react-icons/fa6"; // Import eye icons

import { useSignup } from "../../../hooks/authHooks/useSignup";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    fullName: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false); // New state for password visibility

  const { signup, isPending, isError, error } = useSignup(formData);

  const handleSubmit = (e) => {
    e.preventDefault();
    signup(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="max-w-screen-xl mx-auto flex h-screen px-10">
      <div className="flex-1 hidden lg:flex items-center justify-center">
        <XSvg className=" lg:w-2/3 fill-primary" />
      </div>
      <div className="flex-1 flex flex-col items-center pt-8 md:justify-center">
        {/* Warning/Reminder Section */}
        <div className="bg-yellow-800 text-yellow-100 p-4 rounded-lg mb-6 max-w-md text-center text-sm shadow-lg border border-yellow-700">
          <p className="font-semibold mb-1">Important Account Note:</p>
          <p>
            You <strong>don't have to use a real email address</strong> here. Just enter
            something that looks like an email (e.g., `yourusername@example.com`).
          </p>
          <p className="mt-2">
            <strong>Please write down your password!</strong> If you lose it, there's
            currently <strong>no way to recover your account</strong>.
          </p>
        </div>
        {/* End Warning/Reminder Section */}
        <form
          className="lg:w-2/3  mx-auto md:mx-20 flex gap-4 flex-col"
          onSubmit={handleSubmit}
        >
          <XSvg className="w-24 lg:hidden fill-primary" />
          <h1 className="text-4xl font-extrabold ">Join today.</h1>
          <label className="input input-bordered rounded flex items-center gap-2">
            <MdOutlineMail />
            <input
              type="email"
              className="grow"
              placeholder="Email"
              name="email"
              onChange={handleInputChange}
              value={formData.email}
            />
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="input input-bordered rounded flex items-center gap-2 flex-1">
              <FaUser />
              <input
                type="text"
                className="grow "
                placeholder="Username"
                name="username"
                onChange={handleInputChange}
                value={formData.username}
              />
            </label>
            <label className="input input-bordered rounded flex items-center gap-2 flex-1">
              <MdDriveFileRenameOutline />
              <input
                type="text"
                className="grow"
                placeholder="Full Name"
                name="fullName"
                onChange={handleInputChange}
                value={formData.fullName}
              />
            </label>
          </div>
          <label className="input input-bordered rounded flex items-center gap-2 relative">
            <MdPassword />
            <input
              type={showPassword ? "text" : "password"}
              className="grow mr-6"
              placeholder="Password"
              name="password"
              onChange={handleInputChange}
              value={formData.password}
            />
            {/* Show/Hide password icon */}
            <span
              className="absolute text-slate-500 right-4 cursor-pointer" // Position to the right
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />} {/* Toggle eye icon */}
            </span>
          </label>
          <button className="py-3 text-sm font-semibold rounded-full bg-primary text-white hover:bg-primary/80 transition duration-200">
            {isPending ? "Loading..." : "Sign up"}
          </button>
          {isError && <p className="text-red-500">{error.message}</p>}
        </form>
        <div className="flex flex-col lg:w-2/3 gap-2 mt-4">
          <p className=" text-lg text-center">Already have an account?</p>
          <Link to="/login">
            <button className="btn rounded-full btn-primary  btn-outline w-full">
              Sign in
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default SignUpPage;
