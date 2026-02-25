const Vote = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Cast Your Vote</h1>
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Student Council Election 2024
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Please select one candidate for President
                </p>
              </div>
              <div className="border-t border-gray-200">
                <div className="space-y-4 p-6">
                  <div className="flex items-center">
                    <input
                      id="candidate1"
                      name="candidate"
                      type="radio"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="candidate1" className="ml-3 block text-sm font-medium text-gray-700">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                          JD
                        </div>
                        <div>
                          <div>John Doe</div>
                          <div className="text-xs text-gray-500">Computer Science, Year 3</div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="candidate2"
                      name="candidate"
                      type="radio"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="candidate2" className="ml-3 block text-sm font-medium text-gray-700">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                          JS
                        </div>
                        <div>
                          <div>Jane Smith</div>
                          <div className="text-xs text-gray-500">Business Administration, Year 4</div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="candidate3"
                      name="candidate"
                      type="radio"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="candidate3" className="ml-3 block text-sm font-medium text-gray-700">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                          MB
                        </div>
                        <div>
                          <div>Mike Brown</div>
                          <div className="text-xs text-gray-500">Engineering, Year 3</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Submit Vote
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vote;
