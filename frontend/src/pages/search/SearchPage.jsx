import { BiArrowBack } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import SearchPanel from "../../components/common/SearchPanel";

const SearchPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4 md:hidden w-full">
      <div className="flex items-center mb-4">
        <button onClick={handleBack} className="text-white mr-4">
          <BiArrowBack className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Search</h1>
      </div>
      <SearchPanel />
    </div>
  );
};

export default SearchPage;
