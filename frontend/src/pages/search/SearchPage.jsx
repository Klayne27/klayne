import { useNavigate } from "react-router-dom";
import SearchPanel from "../../components/common/SearchPanel";
import SuggestedUsersPanel from "../../components/common/SuggestedUsersPanel";
import { FaArrowLeft } from "react-icons/fa6";

const SearchPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex-[4_4_0] border-accent min-h-screen py-2 px-0.5">
      <div className="flex items-center gap-2 md:gap-4 px-2.5 md:px-3.5 md:py-1.5 border-accent sticky top-0 z-10 bg-opacity-20 backdrop-blur-md">
        <button
          onClick={handleBack}
          className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
        >
          {" "}
          <FaArrowLeft />
        </button>
        <h1 className="font-bold text-xl flex-1 truncate">Search</h1>
      </div>
      <div className="p-3">
        <SearchPanel />
        <div className="mt-4">
          <SuggestedUsersPanel />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
