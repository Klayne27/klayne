const ProfileHeaderSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 w-full my-2">
      <div className="flex gap-2 items-center">
        <div className="flex flex-1 gap-1">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex flex-col gap-2 py-2">

            <div className="ml-16 skeleton h-4 w-20 rounded-full"></div>
            <div className="ml-16 skeleton h-4 w-12 rounded-full"></div>
            </div>

            <div className="skeleton h-[215px] w-full relative">
              <div className="skeleton size-[140px] rounded-full border-4 border-base-100 absolute -bottom-14 left-4"></div>
            </div>
            <div className="skeleton h-8 mt-4 w-24 ml-auto rounded-full mr-5"></div>
            <div className="ml-4 skeleton h-4 w-14 rounded-full mt-4"></div>
            <div className="ml-4 skeleton h-4 w-20 rounded-full"></div>
            <div className="ml-4 skeleton h-4 w-2/3 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfileHeaderSkeleton;
