import { PDFDocument } from 'pdf-lib';
import { computed, defineComponent, ref } from 'vue';

export default defineComponent(() => {
  const selectedFiles = ref<File[]>([]);
  const isDragging = ref(false);
  const isLoading = ref(false);

  const fileNames = computed(() => selectedFiles.value.map((f) => f.name));

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = true;
  };

  const handleDragLeave = () => {
    isDragging.value = false;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;

    const files = Array.from(e.dataTransfer?.files || []);
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');
    selectedFiles.value = [...selectedFiles.value, ...pdfFiles];
  };

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    selectedFiles.value = [...selectedFiles.value, ...files];
  };

  const removeFile = (index: number) => {
    selectedFiles.value.splice(index, 1);
  };

  const moveFileUp = (index: number) => {
    if (index > 0) {
      const newFiles = [...selectedFiles.value];
      [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
      selectedFiles.value = newFiles;
    }
  };

  const moveFileDown = (index: number) => {
    if (index < selectedFiles.value.length - 1) {
      const newFiles = [...selectedFiles.value];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      selectedFiles.value = newFiles;
    }
  };

  const mergePDFs = async () => {
    if (selectedFiles.value.length < 2) {
      alert('結合するには2つ以上のPDFファイルを選択してください');
      return;
    }

    isLoading.value = true;
    try {
      // PDFDocumentのインスタンスを作成
      const mergedPdf = await PDFDocument.create();

      // 各PDFファイルを読み込んでマージ
      for (const file of selectedFiles.value) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        const pdf = await PDFDocument.load(pdfBytes);

        // PDFの全ページをコピーして追加
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPages().map((_, i) => i),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // PDFをバイト配列として取得
      const mergedPdfBytes = await mergedPdf.save();

      // ダウンロード
      const blob = new Blob([mergedPdfBytes] as BlobPart[], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      selectedFiles.value = [];
    } catch (error) {
      console.error('エラー:', error);
      alert('PDFの結合に失敗しました');
    } finally {
      isLoading.value = false;
    }
  };

  return () => (
    <div class="flex min-h-screen flex-col gap-8 bg-zinc-950 p-8 font-mono text-zinc-100">
      <h1 class="text-3xl font-bold">PDF結合ツール</h1>

      {/* ドラッグアンドドロップ・ファイル選択エリア */}
      <div
        class={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging.value
            ? 'bg-opacity-10 border-blue-500 bg-blue-500'
            : 'border-zinc-600 hover:border-zinc-500'
        }`}
        onDragover={handleDragOver}
        onDragleave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg class="h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <p class="text-lg text-zinc-300">
          PDFファイルをドラッグアンドドロップするか、下をクリックして選択
        </p>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          class="hidden"
          id="file-input"
        />
        <label
          for="file-input"
          class="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 hover:bg-blue-700"
        >
          ファイルを選択
        </label>
      </div>

      {/* 選択ファイルリスト */}
      {fileNames.value.length > 0 && (
        <div class="flex flex-col gap-4">
          <h2 class="text-xl font-semibold">選択されたファイル ({fileNames.value.length})</h2>
          <div class="space-y-2">
            {fileNames.value.map((name, index) => (
              <div key={index} class="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
                <div class="flex flex-1 items-center gap-3">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                  <span class="text-sm">{name}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onClick={() => moveFileUp(index)}
                    disabled={index === 0}
                    class="rounded-lg bg-blue-600 px-2 py-1 text-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveFileDown(index)}
                    disabled={index === fileNames.value.length - 1}
                    class="rounded-lg bg-blue-600 px-2 py-1 text-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                    title="下に移動"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFile(index)}
                    class="rounded-lg bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF結合ボタン */}
      {fileNames.value.length > 0 && (
        <div class="flex gap-4">
          <button
            onClick={mergePDFs}
            disabled={isLoading.value || selectedFiles.value.length < 2}
            class="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isLoading.value ? '結合中...' : 'PDFを結合してダウンロード'}
          </button>
          <button
            onClick={() => {
              selectedFiles.value = [];
            }}
            class="rounded-lg bg-zinc-700 px-6 py-3 font-semibold hover:bg-zinc-600"
          >
            リセット
          </button>
        </div>
      )}
    </div>
  );
});
