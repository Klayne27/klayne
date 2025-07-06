import { BiArrowBack } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import SearchPanel from "../../components/common/SearchPanel";
import SuggestedUsersPanel from "../../components/common/SuggestedUsersPanel";

const SearchPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flexflex-col h-screen bg-black/0 p-3 md:p-4 md:hidden w-full">
      <div className="flex items-center mb-4">
        <button onClick={handleBack} className=" mr-4">
          <BiArrowBack className="w-6 h-6" />
        </button>
        <h1 className="text-lg md:text-xl font-bold">Search</h1>
      </div>
      <SearchPanel />
      <div className="mt-4">

        <SuggestedUsersPanel />
      </div>
    </div>
  );
};

export default SearchPage;
