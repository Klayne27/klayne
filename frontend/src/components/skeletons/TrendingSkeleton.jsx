const TrendingSkeleton = () => {
  return (
    <div className="my-2 flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        {" "}
        <div className="flex w-full justify-between">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-3 w-20 rounded-full"></div>
            <div className="skeleton h-3 w-12 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default TrendingSkeleton
