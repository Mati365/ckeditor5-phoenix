defmodule CKEditor5.Cloud do
  @moduledoc """
  Represents the Cloud configuration for a CKEditor 5 preset.
  """

  import Norm

  alias CKEditor5.Cloud.CKBox
  alias CKEditor5.{Errors, Helpers}

  @default_editor_version Mix.Project.config()[:cke][:default_editor_version]
  @derive Jason.Encoder
  @type t :: %__MODULE__{
          version: String.t(),
          premium: boolean(),
          translations: [String.t()],
          ckbox: CKBox.t() | nil
        }

  defstruct version: @default_editor_version,
            premium: false,
            translations: [],
            ckbox: nil

  @doc """
  Defines the schema for a raw Cloud configuration map.
  """
  def s do
    schema(%{
      version: spec(is_binary() and (&Helpers.is_semver_version?/1)),
      premium: spec(is_boolean()),
      ckbox: spec(is_map() or is_nil()),
      translations: coll_of(spec(is_binary))
    })
  end

  @doc """
  Parses a map into a Cloud struct.
  Returns {:ok, %Cloud{}} if valid, {:error, reason} if invalid.
  """
  def parse(nil), do: {:ok, nil}

  def parse(map) when is_map(map) do
    with {:ok, _} <- conform(map, s()),
         {:ok, parsed_map} <- parse_ckbox(map) do
      {:ok, struct(__MODULE__, parsed_map)}
    else
      {:error, error} -> {:error, error}
    end
  end

  def parse(_), do: {:error, "Cloud configuration must be a map or nil"}

  @doc """
  Parses a map into a Cloud struct.
  Returns %Cloud{} if valid, raises an error if invalid.
  """
  def parse!(cloud_data) do
    case parse(cloud_data) do
      {:ok, cloud} -> cloud
      {:error, reason} -> raise Errors.InvalidCloudConfiguration, reason: reason
    end
  end

  @doc """
  Merges the current Cloud configuration with the provided overrides.
  """
  def merge(_, nil), do: nil

  def merge(cloud, %__MODULE__{} = override_struct),
    do: merge(cloud, Map.from_struct(override_struct))

  def merge(nil, overrides) when is_map(overrides), do: struct(__MODULE__, overrides)

  def merge(%__MODULE__{} = cloud, overrides) when is_map(overrides) do
    merged_ckbox = CKBox.merge(cloud.ckbox, Map.get(overrides, :ckbox, %{}))

    %__MODULE__{
      version: Map.get(overrides, :version, cloud.version),
      premium: Map.get(overrides, :premium, cloud.premium),
      translations: Map.get(overrides, :translations, cloud.translations),
      ckbox: merged_ckbox
    }
  end

  # Parses the CKBox configuration from a map.
  defp parse_ckbox(%{ckbox: nil} = map), do: {:ok, Map.put(map, :ckbox, nil)}

  defp parse_ckbox(%{ckbox: ckbox_data} = map) do
    case CKBox.parse(ckbox_data) do
      {:ok, ckbox} -> {:ok, Map.put(map, :ckbox, ckbox)}
      {:error, error} -> {:error, error}
    end
  end

  defp parse_ckbox(map), do: {:ok, map}
end
