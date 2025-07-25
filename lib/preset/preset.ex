defmodule CKEditor5.Preset do
  @moduledoc """
  Represents a CKEditor 5 preset configuration.
  """

  alias CKEditor5.{Cloud, License}

  @derive {Jason.Encoder, only: [:type, :config, :license]}
  @type t :: %__MODULE__{
          type: atom(),
          config: map(),
          cloud: Cloud.t() | nil,
          license: License.t()
        }

  defstruct config: %{},
            type: :classic,
            cloud: nil,
            license: License.gpl()

  @doc """
  Sets the type of the preset.
  """
  def of_type(%__MODULE__{} = preset, type) when is_atom(type) do
    %__MODULE__{preset | type: type}
  end

  @doc """
  Merges the current preset configuration with the provided overrides.
  """
  def merge(%__MODULE__{} = preset, overrides) when overrides in [nil, %{}] do
    preset
  end

  def merge(%__MODULE__{} = preset, overrides) when is_map(overrides) do
    %__MODULE__{
      type: overrides[:type] || preset.type,
      config: Map.merge(preset.config || %{}, overrides[:config] || %{}),
      license: overrides[:license] || preset.license,
      cloud: Cloud.merge(preset.cloud, overrides[:cloud])
    }
  end

  @doc """
  Checks if the preset has a Cloud configuration.
  Returns true if the cloud field is not nil, false otherwise.
  """
  def configured_cloud?(%__MODULE__{cloud: cloud}), do: cloud != nil
end
