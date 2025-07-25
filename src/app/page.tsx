export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          商品刊登系统
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center max-w-2xl">
          快速创建和管理您的亚马逊商品刊登信息
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-8">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="/amazon-listing"
          >
            创建新商品刊登
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
            href="#"
          >
            查看已有商品
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">快速刊登</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              简化的表单设计，让您快速完成商品信息填写
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">图片管理</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              支持多图片上传，轻松管理商品图片库
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">数据验证</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              自动验证商品信息，确保符合亚马逊规范
            </p>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
        <p>© 2024 商品刊登系统</p>
      </footer>
    </div>
  );
}
