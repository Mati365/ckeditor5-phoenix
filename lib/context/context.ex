defmodule CKEditor5.Context do
  @moduledoc """
  Represents the CKEditor 5 context configuration.
  """

  import Norm

  alias CKEditor5.{CustomTranslations, Errors}

  @derive Jason.Encoder
  @type t :: %__MODULE__{
          config: map(),
          custom_translations: CustomTranslations.t() | nil
        }

  defstruct config: %{
              plugins: []
            },
            custom_translations: nil

  @doc """
  Defines the schema for a raw Context configuration map.
  """
  def s do
    schema =
      schema(%{
        config: spec(is_map()),
        custom_translations: spec(is_map() or is_nil())
      })

    selection(schema, [:config])
  end

  @doc """
  Parses a map into a Context struct.
  Returns {:ok, %Context{}} if valid, {:error, reason} if invalid.
  """
  def parse(nil), do: {:ok, nil}

  def parse(%__MODULE__{} = context), do: {:ok, context}

  def parse(map) when is_map(map) do
    with {:ok, _} <- conform(map, s()),
         {:ok, parsed_map} <- parse_custom_translations(map) do
      {:ok, struct(__MODULE__, parsed_map)}
    else
      {:error, errors} -> {:error, errors}
    end
  end

  def parse(_), do: {:error, "Context configuration must be a map or nil"}

  # Parses the custom translations from a map into a CustomTranslations struct.
  defp parse_custom_translations(context_map) do
    case CustomTranslations.parse(context_map[:custom_translations]) do
      {:ok, custom_translations} ->
        {:ok, Map.put(context_map, :custom_translations, custom_translations)}

      {:error, error} ->
        {:error, error}
    end
  end

  @doc """
  Parses a map into a Context struct.
  Returns %Context{} if valid, raises an error if invalid.
  """
  def parse!(data) do
    case parse(data) do
      {:ok, context} -> context
      {:error, reason} -> raise Errors.InvalidContext, reason: reason
    end
  end
end
