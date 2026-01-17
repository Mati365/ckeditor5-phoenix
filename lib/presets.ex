defmodule CKEditor5.Presets do
  @moduledoc """
  Provides predefined configurations (presets) for CKEditor 5.
  """

  use Memoize

  alias CKEditor5.{Config, Errors, Helpers}
  alias CKEditor5.Preset.Parser

  @default_presets %{
    "default" => %{
      config: %{
        toolbar: [
          :undo,
          :redo,
          :|,
          :heading,
          :|,
          :fontFamily,
          :fontSize,
          :fontColor,
          :fontBackgroundColor,
          :alignment,
          :|,
          :bold,
          :italic,
          :underline,
          %{
            label: "Text Style",
            items: [:strikethrough, :superscript, :subscript]
          },
          :|,
          :link,
          :insertImage,
          :insertTable,
          :insertTableLayout,
          :blockQuote,
          :emoji,
          :mediaEmbed,
          :|,
          :bulletedList,
          :numberedList,
          :todoList,
          :outdent,
          :indent
        ],
        plugins: [
          :Alignment,
          :AccessibilityHelp,
          :Autoformat,
          :AutoImage,
          :Autosave,
          :BlockQuote,
          :Bold,
          :CloudServices,
          :Essentials,
          :Emoji,
          :Mention,
          :Heading,
          :FontFamily,
          :FontSize,
          :FontColor,
          :FontBackgroundColor,
          :ImageBlock,
          :ImageCaption,
          :ImageInline,
          :ImageInsert,
          :ImageInsertViaUrl,
          :ImageResize,
          :ImageStyle,
          :ImageTextAlternative,
          :ImageToolbar,
          :ImageUpload,
          :Indent,
          :IndentBlock,
          :Italic,
          :Link,
          :LinkImage,
          :List,
          :ListProperties,
          :MediaEmbed,
          :Paragraph,
          :PasteFromOffice,
          :PictureEditing,
          :SelectAll,
          :Table,
          :TableLayout,
          :TableCaption,
          :TableCellProperties,
          :TableColumnResize,
          :TableProperties,
          :TableToolbar,
          :TextTransformation,
          :TodoList,
          :Underline,
          :Strikethrough,
          :Superscript,
          :Subscript,
          :Undo,
          :Base64UploadAdapter
        ],
        table: %{
          contentToolbar: [
            :tableColumn,
            :tableRow,
            :mergeTableCells,
            :tableProperties,
            :tableCellProperties,
            :toggleTableCaption
          ]
        },
        image: %{
          toolbar: [
            "imageStyle:inline",
            "imageStyle:block",
            "imageStyle:wrapText",
            :|,
            :toggleImageCaption,
            :imageTextAlternative,
            :imageResize
          ]
        }
      }
    }
  }

  @doc """
  Retrieves a preset configuration by name.

  Returns `{:ok, preset}` on success, or `{:error, reason}` on failure.
  """
  defmemo get(preset_name) do
    all_presets = presets_with_default()

    with {:ok, preset_config} <- Map.fetch(all_presets, preset_name),
         {:ok, preset} <- Parser.parse(preset_config) do
      {:ok, preset}
    else
      {:error, reason} ->
        {:error, %Errors.InvalidPreset{reason: reason}}

      :error ->
        {:error,
         %Errors.PresetNotFound{
           preset_name: preset_name,
           available_presets: Map.keys(all_presets)
         }}
    end
  end

  @doc """
  Retrieves a preset configuration by name, raising an exception on failure.
  """
  def get!(preset_name) do
    case get(preset_name) do
      {:ok, preset} -> preset
      {:error, reason} -> raise reason
    end
  end

  @doc """
  Returns all available presets, merging environment-specific presets with defaults.
  """
  def presets do
    Config.raw_presets()
    |> Helpers.map_keys_to_strings()
    |> Map.new()
  end

  @doc """
  Returns all available presets, merging environment-specific presets with defaults.
  """
  def presets_with_default do
    Map.merge(@default_presets, presets())
  end
end
